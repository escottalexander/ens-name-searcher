import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { DBHead, ENSNameInfo } from './types';
import fs from 'fs';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { normalize } from 'viem/ens';
import { createPublicClient, http } from 'viem';
import { mainnet } from 'viem/chains';
import { addEnsContracts } from '@ensdomains/ensjs';
import { getAvailable, getExpiry, getPrice } from '@ensdomains/ensjs/public';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const rpcUrl = process.env.RPC_URL;

const client = createPublicClient({
  chain: addEnsContracts(mainnet),
  transport: http(rpcUrl),
});

// Use JSON file for storage
const adapter = new JSONFile<DBHead>('db.json')
const db = new Low<DBHead>(adapter, {
  names: [],
});

async function checkName(name: string, label: string): Promise<ENSNameInfo> {
  const available = await getAvailable(client, { name });
  if (!available) {
    const expiry = await getExpiry(client, { name });
    const expiryTimestamp = expiry?.expiry.date.getTime();
    const isAvailable = expiry?.status === 'expired';
    return { 
      name, 
      available: isAvailable,  
      expiry: expiryTimestamp as number, 
      price: 0, 
      status: expiry?.status as 'active' | 'expired' | 'gracePeriod',
      label // New field
    }
  } else {
    const oneYearInSeconds = 31557600
    const price = await getPrice(client, { nameOrNames: name, duration: oneYearInSeconds })
    const { base, premium } = price
    const priceNumInETH = Number(base + premium) / 10 ** 18
    return { name, available: true, expiry: 0, price: priceNumInETH, status: 'expired', label } // New field
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('file', {
      alias: 'f',
      description: 'JSON file containing words to add',
      type: 'string',
      demandOption: true,
    })
    .option('label', {
      alias: 'l',
      description: 'Label to assign to the added words',
      type: 'string',
      demandOption: true,
    })
    .help()
    .alias('help', 'h').argv

  // Read the database
  await db.read();
  db.data ||= { names: [] };

  // Read words from the specified JSON file
  const wordsToAdd = JSON.parse(fs.readFileSync(argv.file as string, 'utf8'));

  if (!Array.isArray(wordsToAdd)) {
    console.error('The specified file does not contain a valid array of words.');
    process.exit(1);
  }

  let addedCount = 0;
  let skippedCount = 0;

  // Filter words that are less than 3 characters long or contain spaces
  const validWords = wordsToAdd.filter((word: string) => word.length >= 3 && !word.includes(' '));

  for (const word of validWords) {
    const normalizedName = normalize(`${word}.eth`);
    const exists = db.data.names.some(entry => entry.name === normalizedName);

    if (!exists) {
      try {
        const newEntry = await checkName(normalizedName, argv.label);
        db.data.names.push(newEntry);
        addedCount++;
        console.log(`Added: ${normalizedName} (Label: ${argv.label})`);
      } catch (error) {
        console.error(`Error checking name: ${normalizedName}`, error);
      }
    } else {
      skippedCount++;
      console.log(`Skipped: ${normalizedName} (already exists)`);
    }
  }

  // Write the updated data back to the database
  await db.write();

  console.log(`Added ${addedCount} new words to the database with label: ${argv.label}`);
  console.log(`Skipped ${skippedCount} words that already existed.`);
}

main().catch(console.error)
