import fs from 'fs';

let s = fs.readFileSync('clone/src/components/reflect/modals/FilterItemsModal.tsx', 'utf8');
s = s.replace(
  "import { AccountItem } from '../../accounts/accountData';",
  "import { AccountItem } from '../../sidebar/NavAccountRow';"
);
fs.writeFileSync('clone/src/components/reflect/modals/FilterItemsModal.tsx', s, 'utf8');
console.log('Fixed FilterItemsModal import');
