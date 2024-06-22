/**
 * Insert dashes into date or national id number.
 * 
 * @param inputStr date or national id number, 12-13 digits without dashes YYYYMMDDXXXXX
 * @returns date or national id number with dashes YYYY-MM-DD-XXXXX
 */
export function formatWithDashes(inputStr: string) {
    if (inputStr.length === 8) {
        return `${inputStr.substring(0, 4)}-${inputStr.substring(4, 6)}-${inputStr.substring(6)}`;
    } else if (inputStr.length === 12 || inputStr.length === 13) {
        return `${inputStr.substring(0, 4)}-${inputStr.substring(4, 6)}-${inputStr.substring(6, 8)}-${inputStr.substring(8)}`;
    } else {
        return inputStr;
    }
}