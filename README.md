# ENS Name Checker and Reporter

This project consists of three main scripts: `index.ts` for checking and updating ENS name information, `report.ts` for generating reports based on the collected data, and `add-words.ts` for adding new words to the database.

## Prerequisites

- Node.js (v14 or later recommended)
- yarn

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```
   yarn install
   ```

3. Create a `.env` file in the root directory and add your RPC URL:
   ```
   RPC_URL=https://your-ethereum-rpc-url
   ```

## Running the Scripts

All scripts can be run using `tsx`, which allows you to run TypeScript files directly without compiling them first.

### Index Script (ENS Name Checker)

The `index.ts` script checks and updates ENS name information for existing entries in the database.

To run the index script:

```
tsx index.ts
```

This script will:
- Read the existing database (`db.json`).
- Check for updates on names that are expiring within the next 30 days.
- Update the database with any changes in name status, availability, or price.
- Display the number of names updated.

### Report Script

The `report.ts` script generates reports based on the data collected by the index script.

To run the report script:

```
tsx report.ts [options]
```

Available options:

- `--available` or `-a`: Filter by availability (boolean)
- `--status` or `-s`: Filter by status (active, expired, gracePeriod)
- `--maxPrice` or `-m`: Filter by maximum price in ETH (number)
- `--expiringWithin` or `-e`: Filter by names expiring within X days (number)
- `--sort`: Sort results by field (name, price, expiry)
- `--maxLength`: Filter by maximum name length excluding .eth (number)
- `--page`: Page number (default: 1)
- `--pageSize`: Number of items per page (default: 100)
- `--filterFile`: JSON file containing an array of names to filter by (string)

Example usage:

```
tsx report.ts --available --maxPrice 0.1 --sort price --page 1 --pageSize 20
```

This command will show the first page of 20 available names priced at 0.1 ETH or less, sorted by price.

### Add Words Script

The `add-words.ts` script allows you to add new words to the database from a specified JSON file.

To run the add words script:

```
tsx add-words.ts --file <path-to-json-file>
```

The JSON file should contain an array of words to add. For example:

```json
["word1", "word2", "word3"]
```

This script will:
- Read words from the specified JSON file
- Add new words to the database (excluding any that already exist)
- Display the number of words added and skipped

Example usage:

```
tsx add-words.ts --file new-words.json
```

### Check Grace Period Script

The `check-grace-period.ts` script checks for updates on names that are in the grace period.

To run the check grace period script:

```
tsx check-grace-period.ts
```

This script will:
- Read the database and filter for names in the grace period
- Check the current status of each of these names
- Update the database with any changes in status or availability
- Display the number of names updated

Run this script periodically to keep your database up-to-date with the latest status of names in the grace period.

## Notes

- The `add-words.ts` script is used to initially populate the database and add new words.
- The `index.ts` script updates the `db.json` file with the latest ENS name information for existing entries.
- Run `index.ts` periodically to keep your database up-to-date, especially for names nearing expiration.
- The `report.ts` script reads from the `db.json` file to generate reports.
- After adding new words with `add-words.ts`, run `index.ts` to check their ENS status.
