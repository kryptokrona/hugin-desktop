export function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export function numberWithCommas(numbers) {
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function prettyNumbers(amount) {
  /* Get the amount we need to divide atomic units by. 2 decimal places = 100 */
  const divisor = Math.pow(10, 5);
  const dollars = amount >= 0 ? Math.floor(amount / divisor) : Math.ceil(amount / divisor);
  /* Make sure 1 is displaced as 01 */
  const cents = (Math.abs(amount % divisor)).toString().padStart(5,'0');
  /* Makes our numbers thousand separated. https://stackoverflow.com/a/2901298/8737306 */
  const formatted = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return formatted + '.' + cents + ' ' + 'XKR';
}

export const openURL = (link) => {
    window.api.send('openLink', link)
}