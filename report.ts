import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { DBHead, ENSNameInfo } from './types'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'fs'

// Use JSON file for storage
const adapter = new JSONFile<DBHead>('db.json')
const db = new Low<DBHead>(adapter, {
  names: [],
})

// Load common names
const commonNames = JSON.parse(fs.readFileSync('commonNames.json', 'utf8')).map(name => name.toLowerCase());

async function main() {
  await db.read()

  const argv = await yargs(hideBin(process.argv))
    .option('available', {
      alias: 'a',
      description: 'Filter by availability',
      type: 'boolean',
    })
    .option('status', {
      alias: 's',
      description: 'Filter by status (active, expired, gracePeriod)',
      type: 'string',
      choices: ['active', 'expired', 'gracePeriod'],
    })
    .option('maxPrice', {
      alias: 'm',
      description: 'Filter by maximum price (in ETH)',
      type: 'number',
    })
    .option('expiringWithin', {
      alias: 'e',
      description: 'Filter by names expiring within X days',
      type: 'number',
    })
    .option('sort', {
      description: 'Sort results by field',
      type: 'string',
      choices: ['name', 'price', 'expiry'],
    })
    .option('maxLength', {
      description: 'Filter by maximum name length (excluding .eth)',
      type: 'number',
    })
    .option('page', {
      description: 'Page number',
      type: 'number',
      default: 1,
    })
    .option('pageSize', {
      description: 'Number of items per page',
      type: 'number',
      default: 100,
    })
    .option('commonNamesOnly', {
      description: 'Only show names that are in commonNames.json',
      type: 'boolean',
    })
    .help()
    .alias('help', 'h').argv

  let filteredNames = db.data?.names || []

  // Apply filters
  if (argv.available !== undefined) {
    filteredNames = filteredNames.filter((name) => name.available === argv.available)
  }

  if (argv.status) {
    filteredNames = filteredNames.filter((name) => name.status === argv.status)
  }

  if (argv.maxPrice !== undefined) {
    filteredNames = filteredNames.filter((name) => name.price <= (argv.maxPrice as number))
  }

  if (argv.expiringWithin !== undefined) {
    const expirationThreshold = Date.now() + argv.expiringWithin * 24 * 60 * 60 * 1000
    filteredNames = filteredNames.filter(
      (name) => name.expiry > 0 && name.expiry <= expirationThreshold
    )
  }

  if (argv.maxLength !== undefined) {
    filteredNames = filteredNames.filter((name) => name.name.replace('.eth', '').length <= (argv.maxLength as number))
  }

  if (argv.commonNamesOnly) {
    filteredNames = filteredNames.filter((name) => 
      commonNames.includes(name.name.replace('.eth', '').toLowerCase())
    )
  }

  // Sort results
  if (argv.sort) {
    filteredNames.sort((a, b) => {
      if (a[argv.sort as keyof ENSNameInfo] < b[argv.sort as keyof ENSNameInfo]) return -1
      if (a[argv.sort as keyof ENSNameInfo] > b[argv.sort as keyof ENSNameInfo]) return 1
      return 0
    })
  }

  // Calculate pagination
  const totalItems = filteredNames.length
  const totalPages = Math.ceil(totalItems / argv.pageSize)
  const currentPage = Math.min(Math.max(1, argv.page), totalPages)
  const startIndex = (currentPage - 1) * argv.pageSize
  const endIndex = startIndex + argv.pageSize

  // Apply pagination
  const paginatedNames = filteredNames.slice(startIndex, endIndex)

  // Display results
  console.table(
    paginatedNames.map((name) => ({
      ...name,
      expiry: name.expiry ? new Date(name.expiry).toISOString() : 'N/A',
      price: name.price ? `${name.price} ETH` : 'N/A',
    }))
  )

  console.log(`Page ${currentPage} of ${totalPages}`)
  console.log(`Showing ${paginatedNames.length} of ${totalItems} total results`)
}

main().catch(console.error)
