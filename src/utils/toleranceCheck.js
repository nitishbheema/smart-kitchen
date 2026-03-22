export function checkStatus(actual, target) {
  const min = target - 10;
  const max = target + 10;

  if (actual < min) return "UNDER";
  if (actual > max) return "OVER";
  return "OK";
}