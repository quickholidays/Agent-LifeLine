const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx !== -1) {
      const key = line.slice(0, idx).trim();
      let val = line.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

async function extractAllUsers() {
  const env = loadEnv();
  const token = env.GHL_TOKEN || env.NEXT_PUBLIC_GHL_TOKEN;
  const locationId = env.GHL_LOCATION_ID || env.NEXT_PUBLIC_GHL_LOCATION_ID;

  const url = `https://services.leadconnectorhq.com/users/?locationId=${locationId}`;
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version': '2021-07-28',
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    console.error(`Failed to fetch: ${res.status} ${res.statusText}`);
    return;
  }

  const data = await res.json();
  const users = data.users || [];

  console.log(`Total users found: ${users.length}\n`);

  const userList = users.map(u => ({
    id: u.id,
    name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    email: u.email || '',
    phone: u.phone || '',
    role: u.roles?.role || u.roles?.type || '',
    type: u.roles?.type || '',
    deleted: !!u.deleted
  }));

  console.log(JSON.stringify(userList, null, 2));

  // Save to scratch file for reference if needed
  fs.writeFileSync(path.resolve(__dirname, 'ghl_users_extracted.json'), JSON.stringify(userList, null, 2));
}

extractAllUsers();
