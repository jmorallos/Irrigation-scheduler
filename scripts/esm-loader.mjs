export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && !/\.(js|jsx|mjs|cjs|json)$/.test(specifier)) {
    try {
      return await nextResolve(`${specifier}.js`, context);
    } catch {
      return nextResolve(specifier, context);
    }
  }
  return nextResolve(specifier, context);
}
