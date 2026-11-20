import { SCHOOLS } from '@/lib/schools';

// The list of KU schools offered as suggestions. Put <SchoolDatalist /> next to any school input and give that input list={SCHOOL_LIST_ID}.
// People can still type their own: this only saves typing and keeps the names the same everywhere.
export const SCHOOL_LIST_ID = 'unidesk-schools';

export default function SchoolDatalist() {
  return <datalist id={SCHOOL_LIST_ID}>{SCHOOLS.map(x => <option key={x} value={x} />)}</datalist>;
}
