import ReactSelect from 'react-select'

const buildStyles = (size) => {
  const isSmall = size === 'sm'
  return {
    control: (base, state) => ({
      ...base,
      background: 'rgba(10,14,28,0.85)',
      borderColor: state.isFocused ? '#f97316' : 'rgba(14,165,233,0.2)',
      boxShadow: state.isFocused ? '0 0 0 1px #f97316' : 'none',
      '&:hover': { borderColor: 'rgba(14,165,233,0.4)' },
      borderRadius: isSmall ? 6 : 8,
      minHeight: isSmall ? 30 : 36,
      fontSize: isSmall ? 12 : 13,
      cursor: 'pointer',
    }),
    valueContainer: (base) => ({
      ...base,
      padding: isSmall ? '0 8px' : '0 10px',
    }),
    menu: (base) => ({
      ...base,
      background: '#0d1526',
      border: '1px solid rgba(14,165,233,0.2)',
      borderRadius: 8,
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
      zIndex: 9999,
    }),
    menuList: (base) => ({
      ...base,
      padding: 4,
      maxHeight: 220,
    }),
    option: (base, { isSelected, isFocused }) => ({
      ...base,
      background: isSelected
        ? 'rgba(249,115,22,0.15)'
        : isFocused
        ? 'rgba(14,165,233,0.08)'
        : 'transparent',
      color: isSelected ? '#f97316' : '#e2eaf8',
      fontSize: isSmall ? 12 : 13,
      borderRadius: 5,
      cursor: 'pointer',
      padding: isSmall ? '5px 10px' : '7px 12px',
    }),
    singleValue: (base) => ({
      ...base,
      color: '#e2eaf8',
    }),
    placeholder: (base) => ({
      ...base,
      color: '#5566aa',
    }),
    input: (base) => ({
      ...base,
      color: '#e2eaf8',
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? '#f97316' : 'rgba(14,165,233,0.5)',
      padding: isSmall ? '0 6px' : '0 8px',
      '&:hover': { color: '#f97316' },
    }),
    indicatorSeparator: () => ({ display: 'none' }),
    clearIndicator: (base) => ({
      ...base,
      color: 'rgba(14,165,233,0.5)',
      padding: isSmall ? '0 4px' : '0 6px',
      '&:hover': { color: '#f97316' },
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: '#5566aa',
      fontSize: 13,
    }),
  }
}

export default function AppSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  isDisabled = false,
  isSearchable = false,
  size = 'md',
  minWidth,
  isClearable = false,
}) {
  const selected = options.find(o => String(o.value) === String(value)) || null

  return (
    <ReactSelect
      value={selected}
      onChange={opt => onChange(opt ? opt.value : '')}
      options={options}
      placeholder={placeholder}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      isClearable={isClearable}
      styles={{
        ...buildStyles(size),
        container: (base) => ({ ...base, minWidth: minWidth || 'auto' }),
      }}
      menuPortalTarget={document.body}
      menuPosition="fixed"
    />
  )
}
