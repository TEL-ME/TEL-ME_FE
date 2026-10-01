export type StoredMessage = { messageId: number; sequenceNo: number; role: string; messageType: string; content: string|null; status: string; storeResults?: {storeId:number;name:string;address?:string;demo?:boolean}[]; sources?: string[] };
export type StoredHistory = { messages: StoredMessage[]; runningExecutionId: number|null; hasOlderMessages: boolean; nextBeforeSequenceNo: number|null };
export function savedSession(storage: Storage, key: string): number|null;
export function rememberSession(storage: Storage, key: string, id: number|null): void;
export function recoverHistory(request: (path:string, signal:AbortSignal)=>Promise<StoredHistory>, publish:(history:StoredHistory)=>void, signal:AbortSignal, pause?:()=>Promise<void>):Promise<StoredHistory>;
