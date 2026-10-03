import { csvCell } from '../csvCell'

describe('csvCell', () => {
  it('quotes plain text and doubles inner quotes', () => {
    expect(csvCell('Maya "MJ" Reynolds')).toBe('"Maya ""MJ"" Reynolds"')
  })

  it('defuses spreadsheet formulas typed by a buyer', () => {
    expect(csvCell('=HYPERLINK("http://evil","x")')).toBe(`"'=HYPERLINK(""http://evil"",""x"")"`)
    expect(csvCell('+1+2')).toBe(`"'+1+2"`)
    expect(csvCell('-2+3')).toBe(`"'-2+3"`)
    expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`)
  })

  it('keeps plain phone numbers readable', () => {
    expect(csvCell('+15125550001')).toBe('"+15125550001"')
    expect(csvCell('+1 (512) 555-0001')).toBe('"+1 (512) 555-0001"')
  })

  it('handles empty values', () => {
    expect(csvCell(null)).toBe('""')
    expect(csvCell(undefined)).toBe('""')
  })
})
