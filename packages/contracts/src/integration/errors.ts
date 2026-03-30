export type ContractErrorCode =
    | "MODULE_LOAD_FAILED"
    | "MODULE_RUNTIME_FAILED"
    | "POSTMESSAGE_TIMEOUT"
    | "POSTMESSAGE_BAD_PAYLOAD"
    | "UNKNOWN";

export class ContractError extends Error {
    public readonly code: ContractErrorCode;
    public readonly cause?: unknown;

    constructor(code: ContractErrorCode, message: string, cause?: unknown) {
        super(message);
        this.name = "ContractError";
        this.code = code;
        this.cause = cause;
    }
}
