import { ArrayType, MapType, IntegerType, OptionType, Schema, SetType, StructType, integers, EnumType, VecType } from './types.js';
import { EncodeBuffer } from './buffer.js';
import * as utils from './utils.js';
import { PublicKey } from '@solana/web3.js';

export class BorshSerializer {
    encoded: EncodeBuffer;
    fieldPath: string[];
    checkTypes: boolean;

    constructor(checkTypes) {
        this.encoded = new EncodeBuffer();
        this.fieldPath = ['value'];
        this.checkTypes = checkTypes;
    }

    encode(value: unknown, schema: Schema): Uint8Array {
        this.encode_value(value, schema);
        return this.encoded.get_used_buffer();
    }

    encode_value(value: unknown, schema: Schema): void {
        if (typeof schema === 'string') {
            if (integers.includes(schema)) return this.encode_integer(value, schema);
            if (schema === 'string') return this.encode_string(value);
            if (schema === 'bool') return this.encode_boolean(value);
            if (schema === 'publicKey') return this.encode_publicKey(value);
            if (schema === 'bytes') return this.encode_bytes(value);
        }

        if (typeof schema === 'object') {
            if ('option' in schema) return this.encode_option(value, schema as OptionType);
            if ('enum' in schema) return this.encode_enum(value, schema as EnumType);
            if ('array' in schema) return this.encode_array(value, schema as ArrayType);
            if ('vec' in schema) return this.encode_vec(value, schema as VecType);
            if ('set' in schema) return this.encode_set(value, schema as SetType);
            if ('map' in schema) return this.encode_map(value, schema as MapType);
            if ('struct' in schema) return this.encode_struct(value, schema as StructType);
        }
    }

    encode_integer(value: unknown, schema: IntegerType): void {
        const size: number = parseInt(schema.substring(1));

        if (size <= 32 || schema == 'f64') {
            this.checkTypes && utils.expect_type(value, 'number', this.fieldPath);
            this.encoded.store_value(value as number, schema);
        } else {
            this.checkTypes && utils.expect_bigint(value, this.fieldPath);
            this.encode_bigint(BigInt(value as string), size);
        }
    }

    encode_bigint(value: bigint, size: number): void {
        const buffer_len = size / 8;
        const buffer = new Uint8Array(buffer_len);

        for (let i = 0; i < buffer_len; i++) {
            buffer[i] = Number(value & BigInt(0xff));
            value = value >> BigInt(8);
        }

        this.encoded.store_bytes(new Uint8Array(buffer));
    }

    encode_publicKey(value: unknown | PublicKey): void {
        this.checkTypes && utils.expect_type(value, 'string', this.fieldPath);
        const _value = new PublicKey(value);
        this.encoded.store_bytes(_value.toBytes());
    }

    encode_bytes(value: unknown): void {
        if (!(value instanceof Uint8Array) && !(Array.isArray(value))) {
            throw new Error(`Expected Uint8Array or Array not ${typeof (value)}(${value}) at ${this.fieldPath.join('.')}`);
        }

        const _value = value instanceof Uint8Array ? value : new Uint8Array(value);

        // 4 bytes for length + the bytes
        this.encoded.store_value(_value.length, 'u32');
        this.encoded.store_bytes(_value);
    }

    encode_string(value: unknown): void {
        this.checkTypes && utils.expect_type(value, 'string', this.fieldPath);
        const _value = value as string;

        // encode to utf8 bytes without using TextEncoder
        const utf8Bytes: number[] = [];
        for (let i = 0; i < _value.length; i++) {
            let charCode = _value.charCodeAt(i);

            if (charCode < 0x80) {
                utf8Bytes.push(charCode);
            } else if (charCode < 0x800) {
                utf8Bytes.push(0xc0 | (charCode >> 6), 0x80 | (charCode & 0x3f));
            } else if (charCode < 0xd800 || charCode >= 0xe000) {
                utf8Bytes.push(0xe0 | (charCode >> 12), 0x80 | ((charCode >> 6) & 0x3f), 0x80 | (charCode & 0x3f));
            } else {
                i++;
                charCode = 0x10000 + (((charCode & 0x3ff) << 10) | (_value.charCodeAt(i) & 0x3ff));
                utf8Bytes.push(
                    0xf0 | (charCode >> 18),
                    0x80 | ((charCode >> 12) & 0x3f),
                    0x80 | ((charCode >> 6) & 0x3f),
                    0x80 | (charCode & 0x3f),
                );
            }
        }

        // 4 bytes for length + string bytes
        this.encoded.store_value(utf8Bytes.length, 'u32');
        this.encoded.store_bytes(new Uint8Array(utf8Bytes));
    }

    encode_boolean(value: unknown): void {
        this.checkTypes && utils.expect_type(value, 'boolean', this.fieldPath);
        this.encoded.store_value(value as boolean ? 1 : 0, 'u8');
    }

    encode_option(value: unknown, schema: OptionType): void {
        if (value === null || value === undefined) {
            this.encoded.store_value(0, 'u8');
        } else {
            this.encoded.store_value(1, 'u8');
            this.encode_value(value, schema.option);
        }
    }

    encode_enum(value: unknown, schema: EnumType): void {
        this.checkTypes && utils.expect_enum(value, this.fieldPath);

        const valueKey = Object.keys(value)[0];

        for (let i = 0; i < schema.enum.length; i++) {
            const valueSchema = schema.enum[i] as StructType;

            if (valueKey === Object.keys(valueSchema.struct)[0]) {
                this.encoded.store_value(i, 'u8');
                return this.encode_struct(value, valueSchema as StructType);
            }
        }
        throw new Error(`Enum key (${valueKey}) not found in enum schema: ${JSON.stringify(schema)} at ${this.fieldPath.join('.')}`);
    }

    encode_array(value: unknown, schema: ArrayType): void {
        if (utils.isArrayLike(value)) return this.encode_arraylike(value as ArrayLike<unknown>, schema);
        if (value instanceof ArrayBuffer) return this.encode_buffer(value, schema);
        throw new Error(`Expected Array-like not ${typeof (value)}(${value}) at ${this.fieldPath.join('.')}`);
    }

    encode_vec(value: unknown, schema: VecType): void {
        if (!utils.isArrayLike(value)) {
            throw new Error(`Expected Array-like not ${typeof (value)}(${value}) at ${this.fieldPath.join('.')}`);
        }

        const _value = value as Array<unknown>;
        // 4 bytes for length
        this.encoded.store_value(_value.length, 'u32');

        // array values
        for (let i = 0; i < _value.length; i++) {
            this.encode_value(_value[i], schema.vec);
        }
    }

    encode_arraylike(value: ArrayLike<unknown>, schema: ArrayType): void {
        if (schema.array.len) {
            utils.expect_same_size(value.length, schema.array.len, this.fieldPath);
        } else {
            // 4 bytes for length
            this.encoded.store_value(value.length, 'u32');
        }

        // array values
        for (let i = 0; i < value.length; i++) {
            this.encode_value(value[i], schema.array.type);
        }
    }

    encode_buffer(value: ArrayBuffer, schema: ArrayType): void {
        if (schema.array.len) {
            utils.expect_same_size(value.byteLength, schema.array.len, this.fieldPath);
        } else {
            // 4 bytes for length
            this.encoded.store_value(value.byteLength, 'u32');
        }

        // array values
        this.encoded.store_bytes(new Uint8Array(value));
    }

    encode_set(value: unknown, schema: SetType): void {
        this.checkTypes && utils.expect_type(value, 'object', this.fieldPath);

        const isSet = value instanceof Set;
        const values = isSet ? Array.from(value.values()) : Object.values(value);

        // 4 bytes for length
        this.encoded.store_value(values.length, 'u32');

        // set values
        for (const value of values) {
            this.encode_value(value, schema.set);
        }
    }

    encode_map(value: unknown, schema: MapType): void {
        this.checkTypes && utils.expect_type(value, 'object', this.fieldPath);

        const isMap = value instanceof Map;
        const keys = isMap ? Array.from(value.keys()) : Object.keys(value);

        // 4 bytes for length
        this.encoded.store_value(keys.length, 'u32');

        // store key/values
        for (const key of keys) {
            this.encode_value(key, schema.map.key);
            this.encode_value(isMap ? value.get(key) : value[key], schema.map.value);
        }
    }

    encode_struct(value: unknown, schema: StructType): void {
        this.checkTypes && utils.expect_type(value, 'object', this.fieldPath);

        for (const key of Object.keys(schema.struct)) {
            this.fieldPath.push(key);
            this.encode_value(value[key], schema.struct[key]);
            this.fieldPath.pop();
        }
    }
}