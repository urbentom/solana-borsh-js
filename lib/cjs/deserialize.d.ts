import { ArrayType, DecodeTypes, MapType, IntegerType, OptionType, Schema, SetType, StructType, EnumType } from './types.js';
import { DecodeBuffer } from './buffer.js';
import { PublicKey } from '@solana/web3.js';
export declare class BorshDeserializer {
    buffer: DecodeBuffer;
    constructor(bufferArray: Uint8Array);
    decode(schema: Schema): DecodeTypes;
    decode_value(schema: Schema): DecodeTypes;
    decode_integer(schema: IntegerType): number | bigint;
    decode_bigint(size: number, signed?: boolean): bigint;
    decode_string(): string;
    decode_bytes(): Uint8Array;
    decode_boolean(): boolean;
    decode_publicKey(): PublicKey;
    decode_option(schema: OptionType): DecodeTypes;
    decode_enum(schema: EnumType): DecodeTypes;
    decode_array(schema: ArrayType): Array<DecodeTypes>;
    decode_set(schema: SetType): Set<DecodeTypes>;
    decode_map(schema: MapType): Map<DecodeTypes, DecodeTypes>;
    decode_struct(schema: StructType): object;
}
