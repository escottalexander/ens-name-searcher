# ENS Name Checker and Reporter

This project consists of two main scripts: `index.ts` for checking and updating ENS name information, and `report.ts` for generating reports based on the collected data.

## Prerequisites

- Node.js (v14 or later recommended)
- npm (comes with Node.js)
- tsx (`npm install -g tsx`)

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your RPC URL:
   ```
   RPC_URL=https://your-ethereum-rpc-url
   ```

4. Ensure you have the following files in your project directory:
   - `firstnames.txt`: A list of first names, one per line
   - `lastnames.txt`: A list of last names, one per line
   - `commonNames.json`: A JSON array of common names

## Running the Scripts

Both scripts can be run using `tsx`, which allows you to run TypeScript files directly without compiling them first.

### Index Script (ENS Name Checker)

The `index.ts` script checks ENS names and updates the database.

To run the index script:

```
tsx index.ts
```

This script will:
- On first run: Check all names in `firstnames.txt`, `lastnames.txt`, and generate combinations of three letters and numbers.
- On subsequent runs: Check names that are expiring within the next 30 days.

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
- `--commonNamesOnly`: Only show names that are in commonNames.json (boolean)

Example usage:

```
tsx report.ts --available --maxPrice 0.1 --sort price --page 1 --pageSize 20
```

This command will show the first page of 20 available names priced at 0.1 ETH or less, sorted by price.

## Notes

- The `index.ts` script updates the `db.json` file with the latest ENS name information.
- The `report.ts` script reads from the `db.json` file to generate reports.
- Make sure to run the `index.ts` script first to populate the database before running the `report.ts` script.
