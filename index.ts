import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { addEnsContracts } from '@ensdomains/ensjs'
import { getAvailable, getExpiry, getPrice } from '@ensdomains/ensjs/public'
import dotenv from 'dotenv'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { DBHead, ENSNameInfo } from './types'
import fs from 'fs'
import { normalize } from 'viem/ens'

// Load environment variables from .env file
dotenv.config();

const rpcUrl = process.env.RPC_URL

const client = createPublicClient({
  chain: addEnsContracts(mainnet),
  transport: http(rpcUrl),
});

// Use JSON file for storage
const adapter = new JSONFile<DBHead>('db.json')
const db = new Low<DBHead>(adapter, {
  names: [],
});

start();

// Check all names in the firstnames.txt file and lastnames.txt file
async function start() {
  // Read data from JSON file, this will set db.data content
  await db.read()

  // If file.json doesn't exist, db.data will be null
  // Set default data
  db.data ||= {
    names: [],
  };

  if (db.data.names.length === 0) {
    console.log('DB is empty, initializing...');
    // On first run we want to check all names in the firstnames.txt and lastnames.txt file
    // and add them to the db.json file
    const firstnames = fs.readFileSync('firstnames.txt', 'utf8').split('\n');
    const lastnames = fs.readFileSync('lastnames.txt', 'utf8').split('\n');
    const allCombinationsOfThreeLetters: string[] = [];
    const alphabet = 'abcdefghijklmnopqrstuvwxyz';
    // Generate all combinations of three letters in alphabet
    for (const letter1 of alphabet) {
      for (const letter2 of alphabet) {
        for (const letter3 of alphabet) {
          allCombinationsOfThreeLetters.push(`${letter1}${letter2}${letter3}`);
        }
      }
    }
    const allCombinationsOfThreeNumbers: string[] = [];
    // Generate all combinations of three numbers between 0-9
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        for (let k = 0; k < 10; k++) {
          allCombinationsOfThreeNumbers.push(`${i}${j}${k}`);
        }
      }
    }
    const allNames = new Set([...firstnames, ...lastnames, ...allCombinationsOfThreeLetters, ...allCombinationsOfThreeNumbers]).values();
    for await (const name of allNames) {
      try {
        const result = await checkName(normalize(`${name}.eth`));
        db.data.names.push(result);
      } catch (error) {
        console.error(`Error checking name: ${name}`, error);
      }
    }
    await db.write();
    console.log('DB initialized');
  } else {
    console.log('DB already initialized');
    // Check all names that have an expiration date in the next 30 days
    const namesToCheck = db.data.names.filter((name) => name.expiry > Date.now() && name.expiry < Date.now() + 30 * 24 * 60 * 60 * 1000);
    for await (const name of namesToCheck) {
      try {
        const result = await checkName(name.name);
        // Update the name in the db.json file
        db.data.names = db.data.names.map((n) => n.name === name.name ? result : n);
      } catch (error) {
        console.error(`Error checking name: ${name.name}`, error);
      }
    }
    await db.write();
    console.log('DB updated');
  }
}


async function checkName(name: string): Promise<ENSNameInfo> {
  // console.log(`Checking name: ${name}`);
  const available = await getAvailable(client, { name });
  if (!available) {
    const expiry = await getExpiry(client, { name });
    const expiryTimestamp = expiry?.expiry.date.getTime();
    const isAvailable = expiry?.status === 'expired';
    return { name, available: isAvailable,  expiry: expiryTimestamp as number, price: 0, status: expiry?.status as 'active' | 'expired' | 'gracePeriod' };
  } else {
    const oneYearInSeconds = 31557600;
    const price = await getPrice(client, { nameOrNames: name, duration: oneYearInSeconds });
    const { base, premium } = price;
    const priceNumInETH = Number(base + premium) / 10 ** 18;
    return { name, available: true, expiry: 0, price: priceNumInETH, status: 'expired' };
  }
}