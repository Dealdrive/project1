const countryCodes = require("country-codes-list");
const countryData = require("country-data");

// Create a custom list with country code, name, and calling code
const myCountryCodesObject = countryCodes.customList(
  "countryCode",
  "[{countryCode}] {countryNameEn}: +{countryCallingCode}"
);

// Function to get currency for each country code
function getCurrencyByCountryCode(countryCode) {
  const country = countryData.countries[countryCode];
  return country ? country.currencies[0] : "Currency not found";
}

// Create a new array of objects with the currency included
const countryCodesWithCurrency = Object.keys(myCountryCodesObject).map(
  (countryCode) => {
    const [code, nameAndCallingCode] =
      myCountryCodesObject[countryCode].split("]");
    const countryName = nameAndCallingCode.split(":")[0].trim();
    const callingCode = nameAndCallingCode
      .split(":")[1]
      .trim()
      .split(" ")[0]
      .substring(1);
    const currency = getCurrencyByCountryCode(countryCode);
    return {
      countryCode,
      countryName,
      callingCode,
      currency,
    };
  }
);

const countryNameByCode = countryCodesWithCurrency.reduce((acc, country) => {
  acc[country.countryCode] = country.countryName;
  return acc;
}, {});

// Function to fetch data for a specific country by country name
function getCountryDataByName(name) {
  return (
    countryCodesWithCurrency.find(
      (country) => country.countryName.toLowerCase() === name.toLowerCase()
    ) || "Country not found"
  );
}

// Create an object with country codes as keys and country names as values
const countryNamesObject = countryCodesWithCurrency.reduce((acc, country) => {
  acc[country.countryCode] = country.countryName;
  return acc;
}, {});

function getCountryNameByCode(countryCode) {
  return countryNameByCode[countryCode] || "Country not found";
}

module.exports = {
  getCountryDataByName,
  countryNamesObject,
  countryCodesWithCurrency,
  getCountryNameByCode,
};
