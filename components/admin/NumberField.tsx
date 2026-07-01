function NumberField({
    label,
    value,
    disabled,
    onChange,
}: {
    label: string;
    value: number;
    disabled?: boolean;
    onChange: (value: number) => void;
}) {
    const displayValue = value === 0 ? '' : String(value);

    return (
        <label className="flex items-center justify-between rounded-xl bg-zinc-900 p-3">
            <span className={disabled ? 'text-zinc-500' : ''}>{label}</span>

            <input
                type="number"
                min={0}
                value={displayValue}
                disabled={disabled}
                placeholder="0"
                onChange={(event) => {
                    const nextValue = event.target.value;

                    onChange(nextValue === '' ? 0 : Number(nextValue));
                }}
                className="w-20 rounded-lg bg-zinc-800 px-2 py-1 text-right disabled:opacity-40"
            />
        </label>
    );
}

export default NumberField;
