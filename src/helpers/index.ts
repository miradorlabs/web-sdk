// Helper serialization functions for browser environment
function serialize(value: Uint8Array): Uint8Array {
  return value;
}

function deserialize(bytes: Uint8Array): Uint8Array {
  return bytes;
}

export {
  deserialize,
  serialize
}
