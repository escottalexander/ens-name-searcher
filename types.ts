export interface DBHead {
    names: ENSNameInfo[];
}

export interface ENSNameInfo {
    name: string;
    available: boolean;
    expiry: number;
    price: number;
    status: 'active' | 'expired' | 'gracePeriod';
    label: string; // New field
}
