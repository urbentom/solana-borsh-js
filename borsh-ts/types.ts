import { PublicKey } from '@solana/web3.js';

export const integers = ['u8', 'u16', 'u32', 'u64', 'u128', 'i8', 'i16', 'i32', 'i64', 'i128', 'f32', 'f64'];

export type IntegerType = typeof integers[number];
export type BoolType = 'bool';
export type StringType = 'string';
export type PublicKeyType = 'publicKey';
export type BytesType = 'bytes';

export type OptionType = { option: Schema };
export type ArrayType = { array: { type: Schema, len?: number } };
export type VecType = { vec: Schema };
export type EnumType = { enum: Array<StructType> };
export type SetType = { set: Schema };
export type MapType = { map: { key: Schema, value: Schema } };
export type StructType = { struct: { [key: string]: Schema } };
export type Schema = IntegerType | BoolType | StringType | OptionType | ArrayType | EnumType | SetType | MapType | StructType | PublicKeyType | BytesType | VecType;

// returned
export type DecodeTypes = number | bigint | string | boolean | Array<DecodeTypes> | EnumType | ArrayBuffer | Map<DecodeTypes, DecodeTypes> | Set<DecodeTypes> | object | null | PublicKey;
