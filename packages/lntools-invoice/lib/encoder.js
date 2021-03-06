// @ts-check

const bech32 = require('bech32');
const bech32Util = require('./bech32-util');
const WordCursor = require('./word-cursor');
const crypto = require('./crypto');
const encodePico = require('./encode-pico');
const { FIELD_TYPE } = require('./constants');

module.exports = {
  encode,
};

function encode(invoice, privKey) {
  let writer = new WordCursor();

  let encodedAmount = encodePico(invoice._value ? invoice._value.toString() : null) || '';
  let prefix = `ln${invoice.network}${encodedAmount}`;

  writer.writeUIntBE(invoice.timestamp, 7);

  _encodeData(invoice, writer);

  // generate sig data
  let bytes = bech32Util.convertWords(writer.words, 5, 8, true);
  let sigData = Buffer.concat([Buffer.from(prefix, 'utf8'), Buffer.from(bytes)]);

  // generate sig hash
  let sigHash = crypto.sha256(sigData);

  // sign
  let { signature, recovery } = crypto.ecdsaSign(sigHash, privKey);

  writer.writeBytes(signature);
  writer.writeUIntBE(recovery, 1);

  // finally encode the invoice in bech32 and allow
  // an invoice to be any length
  return bech32.encode(prefix, writer.words, Number.MAX_SAFE_INTEGER);
}

function _encodeData(invoice, writer) {
  for (let datum of invoice.fields) {
    switch (datum.type) {
      case FIELD_TYPE.PAYMENT_HASH:
        {
          // should be 52, but allow for creation of variable length
          // values so we can construct non-valid invoices for testing
          let dataLen = bech32Util.sizeofBytes(datum.value.byteLength);
          writer.writeUIntBE(datum.type, 1);
          writer.writeUIntBE(dataLen, 2);
          writer.writeBytes(datum.value);
        }
        break;
      case FIELD_TYPE.ROUTE:
        {
          let bits = datum.value.length * (264 + 64 + 32 + 32 + 16);
          writer.writeUIntBE(datum.type, 1);
          let dataLen = bech32Util.sizeofBits(bits);
          writer.writeUIntBE(dataLen, 2);
          let buffer = Buffer.alloc(bits / 8);
          let position = 0;
          for (let route of datum.value) {
            route.pubkey.copy(buffer, position);
            position += 264 / 8;
            route.short_channel_id.copy(buffer, position);
            position += 64 / 8;
            buffer.writeUInt32BE(route.fee_base_msat, position);
            position += 32 / 8;
            buffer.writeUInt32BE(route.fee_proportional_millionths, position);
            position += 32 / 8;
            buffer.writeUInt16BE(route.cltv_expiry_delta, position);
            position += 16 / 8;
          }
          writer.writeBytes(buffer);
        }
        break;
      case FIELD_TYPE.EXPIRY:
        {
          let dataLen = bech32Util.sizeofNum(datum.value);
          writer.writeUIntBE(datum.type, 1);
          writer.writeUIntBE(dataLen, 2);
          writer.writeUIntBE(datum.value, dataLen);
        }
        break;
      case FIELD_TYPE.FALLBACK_ADDRESS:
        {
          let dataLen = bech32Util.sizeofBytes(datum.value.address.byteLength) + 1;
          writer.writeUIntBE(datum.type, 1);
          writer.writeUIntBE(dataLen, 2);
          writer.writeUIntBE(datum.value.version, 1);
          writer.writeBytes(datum.value.address);
        }
        break;
      case FIELD_TYPE.SHORT_DESC:
        {
          let buf = Buffer.from(datum.value, 'utf8');
          let dataLen = bech32Util.sizeofBytes(buf.byteLength);
          writer.writeUIntBE(datum.type, 1);
          writer.writeUIntBE(dataLen, 2);
          writer.writeBytes(buf);
        }
        break;
      case FIELD_TYPE.PAYEE_NODE:
        {
          // should be 53, but allow for creation of variable length
          // values so we can construct non-valid invoices for testing
          let dataLen = bech32Util.sizeofBytes(datum.value.byteLength);
          writer.writeUIntBE(datum.type, 1);
          writer.writeUIntBE(dataLen, 2);
          writer.writeBytes(datum.value);
        }
        break;
      case FIELD_TYPE.HASH_DESC:
        {
          let dataLen = bech32Util.sizeofBytes(datum.value.byteLength);
          writer.writeUIntBE(datum.type, 1);
          writer.writeUIntBE(dataLen, 2);
          writer.writeBytes(datum.value);
        }
        break;
      case FIELD_TYPE.MIN_FINAL_CLTV_EXPIRY:
        {
          let dataLen = bech32Util.sizeofNum(datum.value);
          writer.writeUIntBE(datum.type, 1);
          writer.writeUIntBE(dataLen, 2);
          writer.writeUIntBE(datum.value, dataLen);
        }
        break;
      default: {
        if (!(datum.value instanceof Buffer)) throw new Error('Cannot process unknown field');
        let dataLen = bech32Util.sizeofBytes(datum.value.byteLength);
        writer.writeUIntBE(datum.type, 1);
        writer.writeUIntBE(dataLen, 2);
        writer.writeBytes(datum.value);
      }
    }
  }
}
