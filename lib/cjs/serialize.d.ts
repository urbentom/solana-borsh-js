import { ArrayType, MapType, IntegerType, OptionType, Schema, SetType, StructType, EnumType, VecType } from './types.js';
import { EncodeBuffer } from './buffer.js';
import { PublicKey } from '@solana/web3.js';
export declare class BorshSerializer {
    encoded: EncodeBuffer;
    fieldPath: string[];
    checkTypes: boolean;
    constructor(checkTypes: any);
    encode(value: unknown, schema: Schema): Uint8Array;
    encode_value(value: unknown, schema: Schema): void;
    encode_integer(value: unknown, schema: IntegerType): void;
    encode_bigint(value: bigint, size: number): void;
    encode_publicKey(value: unknown | PublicKey): void;
    encode_bytes(value: unknown): void;
    encode_string(value: unknown): void;
    encode_boolean(value: unknown): void;
    encode_option(value: unknown, schema: OptionType): void;
    encode_enum(value: unknown, schema: EnumType): void;
    encode_array(value: unknown, schema: ArrayType): void;
    encode_vec(value: unknown, schema: VecType): void;
    encode_arraylike(value: ArrayLike<unknown>, schema: ArrayType): void;
    encode_buffer(value: ArrayBuffer, schema: ArrayType): void;
    encode_set(value: unknown, schema: SetType): void;
    encode_map(value: unknown, schema: MapType): void;
    encode_struct(value: unknown, schema: StructType): void;
}
