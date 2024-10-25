export type DBHead = {
    names: ENSNameInfo[],
}

export type ENSNameInfo = {
    name: string;
    available: boolean;
    expiry: number;
    price: number;
    status: 'active' | 'expired' | 'gracePeriod';
}