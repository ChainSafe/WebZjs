declare module '*.wasm' {
  const wasmBinary: BufferSource;
  export default wasmBinary;
}
