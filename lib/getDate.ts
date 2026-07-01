export function getDate(value: unknown) {
    if (
        value &&
        typeof value === 'object' &&
        'toDate' in value &&
        typeof value.toDate === 'function'
    ) {
        return value.toDate();
    }

    return new Date(value as string | number | Date);
}
