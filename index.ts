import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { addEnsContracts } from '@ensdomains/ensjs'
import { getAvailable, getExpiry, getPrice } from '@ensdomains/ensjs/public'
import dotenv from 'dotenv'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { DBHead, ENSNameInfo } from './types'

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

async function main() {
  // Read data from JSON file
  await db.read()

  if (!db.data || db.data.names.length === 0) {
    console.log('Database is empty. Please use add-words.ts to add names first.');
    return;
  }

  console.log('Checking for updates...');
  
  // Check all names that have an expiration date in the next 30 days
  const namesToCheck = db.data.names.filter((name) => 
    name.expiry > Date.now() && name.expiry < Date.now() + 30 * 24 * 60 * 60 * 1000
  );

  console.log(`Found ${namesToCheck.length} names to check.`);

  let updatedCount = 0;

  for await (const name of namesToCheck) {
    try {
      const result = await checkName(name.name, name.label);
      if (JSON.stringify(result) !== JSON.stringify(name)) {
        // Update the name in the db.json file if there are changes
        Object.assign(name, result);
        updatedCount++;
        console.log(`Updated: ${name.name}`);
      }
    } catch (error) {
      console.error(`Error checking name: ${name.name}`, error);
    }
  }

  await db.write();
  console.log(`Updated ${updatedCount} names.`);
}

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
      label
    };
  } else {
    const oneYearInSeconds = 31557600;
    const price = await getPrice(client, { nameOrNames: name, duration: oneYearInSeconds });
    const { base, premium } = price;
    const priceNumInETH = Number(base + premium) / 10 ** 18;
    return { 
      name, 
      available: true, 
      expiry: 0, 
      price: priceNumInETH, 
      status: 'expired',
      label
    };
  }
}

main().catch(console.error);
