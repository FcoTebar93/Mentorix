export interface DbHealthPort {
    check(): Promise<void>;
}