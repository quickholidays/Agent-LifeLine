/**
 * GHL Call Recording Extractor (Opportunities-Only Mode)
 * 
 * - ONLY checks contacts & opportunities specified in Test-Data/recording/opportunities.csv
 * - Direct contact lookup (no scanning through unrelated GHL conversations)
 * - Processes opportunities in reverse chronological order (Latest / most recent first)
 * - Saves recordings ONLY into Test-Data/recording/ with dedicated separate agent folders:
 *     Test-Data/recording/Annie Adams/
 *     Test-Data/recording/Jennie Miller/
 * - File naming format: {timestamp}_{calledToNumber}.{ext}
 */

const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env.local
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('❌ Error: .env.local file not found at', envPath);
    process.exit(1);
  }
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

const env = loadEnv();
const GHL_TOKEN = env.GHL_TOKEN || env.NEXT_PUBLIC_GHL_TOKEN;
const GHL_LOCATION_ID = env.GHL_LOCATION_ID || env.NEXT_PUBLIC_GHL_LOCATION_ID;

if (!GHL_TOKEN || !GHL_LOCATION_ID) {
  console.error('❌ Error: Missing GHL_TOKEN or GHL_LOCATION_ID in .env.local');
  process.exit(1);
}

// Utility: Sleep / Delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Format date to filename safe string: YYYY-MM-DD_HH-mm-ss
function formatTimestampForFilename(dateInput) {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return 'unknown_date';
  }
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}`;
}

// Sanitize phone number for safe filenames across OS
function sanitizePhoneNumber(phone) {
  if (!phone) return 'unknown_number';
  let clean = String(phone).replace(/[^\w\d+-]/g, '').trim();
  return clean || 'unknown_number';
}

// Robust CSV Parser that handles quoted multi-line fields
function parseCSV(text) {
  const rows = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        row[row.length - 1] += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      rows.push(row.map(c => c.trim()));
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }
  if (row.length > 1 || row[0] !== '') {
    rows.push(row.map(c => c.trim()));
  }
  return rows;
}

// Load opportunities from opportunities.csv
function loadOpportunitiesFromCSV() {
  const possiblePaths = [
    path.resolve(__dirname, '..', 'Test-Data', 'recording', 'opportunities.csv'),
    path.resolve(__dirname, '..', 'Test-Data', 'opportunities (10).csv')
  ];

  let csvPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      csvPath = p;
      break;
    }
  }

  if (!csvPath) {
    console.error('❌ Error: opportunities.csv not found in Test-Data/recording/');
    process.exit(1);
  }

  console.log(`📄 Loading Opportunities from: ${csvPath}`);
  const content = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCSV(content);

  if (rows.length < 2) {
    console.error('❌ Error: opportunities.csv is empty or invalid.');
    process.exit(1);
  }

  const headers = rows[0];
  const assignedIdx = headers.indexOf('assigned');
  const nameIdx = headers.indexOf('Contact Name');
  const phoneIdx = headers.indexOf('phone');
  const phone2Idx = headers.indexOf('Phone');
  const contactIdIdx = headers.indexOf('Contact ID');
  const oppNameIdx = headers.indexOf('Opportunity name');
  const createdIdx = headers.indexOf('Created on');
  const updatedIdx = headers.indexOf('Updated on');

  const opportunitiesList = [];
  const seenContacts = new Set();
  const agentCounts = {};

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length < 5) continue;

    const assigned = (r[assignedIdx] || '').trim();
    if (!assigned) continue;

    const contactId = (r[contactIdIdx] || '').trim();
    const contactName = (r[nameIdx] || r[oppNameIdx] || 'Unknown Contact').trim();
    const phone = (r[phoneIdx] || r[phone2Idx] || '').trim();
    const createdOn = r[createdIdx] || '';
    const updatedOn = r[updatedIdx] || createdOn;

    // Deduplicate identical contact entries while keeping the most recent
    const dedupeKey = contactId || phone || contactName.toLowerCase();
    if (seenContacts.has(dedupeKey)) continue;
    seenContacts.add(dedupeKey);

    agentCounts[assigned] = (agentCounts[assigned] || 0) + 1;

    opportunitiesList.push({
      contactId,
      contactName,
      phone,
      assignedAgent: assigned,
      createdOn,
      updatedOn,
      timestampSort: new Date(updatedOn || createdOn || 0).getTime()
    });
  }

  // Sort opportunities in DESCENDING order: Latest / Newest first!
  opportunitiesList.sort((a, b) => b.timestampSort - a.timestampSort);

  console.log(`📋 Loaded & Deduplicated ${opportunitiesList.length} Opportunities:`);
  Object.entries(agentCounts).forEach(([agent, count]) => {
    console.log(`   - ${agent}: ${count} leads`);
  });
  console.log(`   Sorted: Most recently created/updated opportunities will be extracted first!\n`);

  return opportunitiesList;
}

// Helper: Make API request to GHL with automatic rate-limit retry
async function fetchGhlJson(endpoint, params = {}) {
  const url = new URL(`https://services.leadconnectorhq.com${endpoint}`);
  Object.keys(params).forEach((k) => {
    if (params[k] !== undefined && params[k] !== null) {
      url.searchParams.append(k, String(params[k]));
    }
  });

  let attempts = 0;
  while (attempts < 5) {
    attempts++;
    try {
      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-04-15',
          'Accept': 'application/json'
        }
      });

      if (res.status === 429) {
        console.warn('  ⚠️ [GHL 429 Rate Limit] Cooling down for 4 seconds...');
        await sleep(4000);
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`GHL API Error ${res.status}: ${errText}`);
      }

      return await res.json();
    } catch (e) {
      if (attempts >= 5) throw e;
      await sleep(1500);
    }
  }
}

// Helper: Fetch binary audio recording for a specific message
async function fetchCallRecordingBinary(messageId, locationId) {
  const url = `https://services.leadconnectorhq.com/conversations/messages/${messageId}/locations/${locationId}/recording`;
  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${GHL_TOKEN}`,
          'Version': '2021-04-15'
        }
      });

      if (res.status === 404) {
        return null;
      }

      if (res.status === 429) {
        console.warn('  ⚠️ [Recording 429 Rate Limit] Cooling down for 4 seconds...');
        await sleep(4000);
        continue;
      }

      if (!res.ok) {
        return null;
      }

      const contentType = res.headers.get('content-type') || '';
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      if (buffer.length === 0) return null;

      // Determine audio extension
      let ext = 'wav';
      if (contentType.includes('mpeg') || contentType.includes('mp3')) {
        ext = 'mp3';
      } else if (buffer.slice(0, 4).toString() === 'RIFF') {
        ext = 'wav';
      } else if (buffer.slice(0, 3).toString() === 'ID3' || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) {
        ext = 'mp3';
      }

      return { buffer, ext, contentType };
    } catch (e) {
      if (attempts >= 3) return null;
      await sleep(1000);
    }
  }
  return null;
}

// Standardize agent folder name
function getAgentFolderName(agentName) {
  const lower = (agentName || '').toLowerCase();
  if (lower.includes('annie')) return 'Annie Adams';
  if (lower.includes('jennie')) return 'Jennie Miller';
  return agentName.replace(/[^\w\d\s-]/g, '').trim() || 'Other Agents';
}

async function extractOpportunitiesOnlyRecordings() {
  console.log('====================================================');
  console.log('🎙️  GHL CALL RECORDINGS EXTRACTOR (OPPORTUNITIES ONLY)');
  console.log('🎯  Target Agents: Annie Adams & Jennie Miller');
  console.log(`🏢  Location ID  : ${GHL_LOCATION_ID}`);
  console.log('====================================================\n');

  // Load ONLY opportunities from the CSV
  const opportunities = loadOpportunitiesFromCSV();

  // Root output directory: Test-Data/recording
  const baseOutputDir = path.resolve(__dirname, '..', 'Test-Data', 'recording');

  // Agent specific folders
  const agentFolders = {
    'Annie Adams': {
      folder: path.join(baseOutputDir, 'Annie Adams'),
      manifest: []
    },
    'Jennie Miller': {
      folder: path.join(baseOutputDir, 'Jennie Miller'),
      manifest: []
    }
  };

  // Ensure directories exist
  Object.values(agentFolders).forEach(f => {
    if (!fs.existsSync(f.folder)) fs.mkdirSync(f.folder, { recursive: true });
  });

  console.log(`📁 Annie Adams Output Folder  : ${agentFolders['Annie Adams'].folder}`);
  console.log(`📁 Jennie Miller Output Folder : ${agentFolders['Jennie Miller'].folder}\n`);

  let checkedCount = 0;
  let totalCallsFound = 0;
  let totalRecordingsDownloaded = 0;
  let totalRecordingsSkipped = 0;

  const overallManifest = [];
  const processedMessageIds = new Set();
  const usedFilenamesByAgent = new Map();

  for (const opp of opportunities) {
    checkedCount++;
    const agentName = getAgentFolderName(opp.assignedAgent);
    if (!agentFolders[agentName]) {
      agentFolders[agentName] = {
        folder: path.join(baseOutputDir, agentName),
        manifest: []
      };
      if (!fs.existsSync(agentFolders[agentName].folder)) fs.mkdirSync(agentFolders[agentName].folder, { recursive: true });
    }

    const targetFolder = agentFolders[agentName].folder;

    process.stdout.write(`\r[${checkedCount}/${opportunities.length}] Checking "${opp.contactName}" (${agentName})... `);

    // 1. Fetch conversations for this specific contact
    let convList = [];
    try {
      if (opp.contactId) {
        const cData = await fetchGhlJson('/conversations/search', {
          locationId: GHL_LOCATION_ID,
          contactId: opp.contactId
        });
        convList = cData.conversations || [];
      } else if (opp.phone) {
        const cData = await fetchGhlJson('/conversations/search', {
          locationId: GHL_LOCATION_ID,
          query: opp.phone
        });
        convList = cData.conversations || [];
      }
    } catch (err) {
      await sleep(100);
      continue;
    }

    if (!convList || convList.length === 0) {
      await sleep(40);
      continue;
    }

    // 2. Fetch messages for each conversation of this contact
    for (const conv of convList) {
      await sleep(50);

      let msgData;
      try {
        msgData = await fetchGhlJson(`/conversations/${conv.id}/messages`, { limit: 100 });
      } catch (err) {
        continue;
      }

      let messages = (msgData && msgData.messages && msgData.messages.messages) 
        ? msgData.messages.messages 
        : (Array.isArray(msgData?.messages) ? msgData.messages : []);

      // Sort messages descending (newest first)
      if (Array.isArray(messages)) {
        messages = [...messages].sort((a, b) => {
          const tA = new Date(a.dateAdded || a.createdAt || 0).getTime();
          const tB = new Date(b.dateAdded || b.createdAt || 0).getTime();
          return tB - tA;
        });
      }

      for (const msg of messages) {
        if (!msg.id || processedMessageIds.has(msg.id)) continue;
        processedMessageIds.add(msg.id);

        const typeLower = String(msg.type || msg.messageType || '').toLowerCase();
        const isCall = (
          typeLower.includes('call') || 
          typeLower.includes('phone') || 
          msg.messageType === 'TYPE_CALL' || 
          msg.messageType === 'TYPE_CAMPAIGN_CALL' || 
          msg.type === 8 || 
          msg.type === 1 || 
          !!msg.call || 
          !!msg.meta?.call
        );

        if (!isCall) continue;

        totalCallsFound++;
        const messageId = msg.id;
        const callStatus = String(msg.status || msg.meta?.call?.status || msg.call?.status || '').toLowerCase();
        const duration = parseInt(msg.meta?.call?.duration || msg.call?.duration || msg.duration || 0, 10);

        // Skip non-audio call events (e.g. no-answer with 0 duration)
        const isNoAudioStatus = ['no-answer', 'busy', 'failed', 'canceled', 'unanswered'].includes(callStatus);
        if (isNoAudioStatus && (!duration || isNaN(duration) || duration <= 0)) {
          continue;
        }

        const dateAdded = msg.dateAdded || msg.createdAt || conv.lastMessageDate || opp.createdOn;
        const direction = msg.direction || msg.call?.direction || 'outbound';
        
        let toNumber = msg.to || msg.call?.to;
        if (!toNumber) {
          toNumber = conv.phone || opp.phone || msg.from;
        }
        if (!toNumber) toNumber = conv.phone || opp.phone || 'unknown';

        const callerNumber = msg.from || msg.call?.from || 'unknown';
        const contactName = opp.contactName || conv.fullName || 'Unknown Contact';

        // Fetch call recording binary
        const recording = await fetchCallRecordingBinary(messageId, GHL_LOCATION_ID);
        if (!recording) continue;

        // Build file name: {timestamp}_{toNumber}.{ext}
        const timeStr = formatTimestampForFilename(dateAdded);
        const cleanPhone = sanitizePhoneNumber(toNumber);
        let baseFilename = `${timeStr}_${cleanPhone}`;
        
        // Handle name collisions
        const agentKey = `${agentName}:${baseFilename}`;
        let count = (usedFilenamesByAgent.get(agentKey) || 0) + 1;
        usedFilenamesByAgent.set(agentKey, count);
        let finalFilename = count === 1 ? `${baseFilename}.${recording.ext}` : `${baseFilename}_(${count}).${recording.ext}`;

        const filePath = path.join(targetFolder, finalFilename);

        const fileRecord = {
          filename: finalFilename,
          agent: agentName,
          messageId: messageId,
          conversationId: conv.id,
          contactId: opp.contactId || conv.contactId,
          contactName: contactName,
          dateAdded: dateAdded,
          formattedTimestamp: timeStr,
          calledToNumber: toNumber,
          callerNumber: callerNumber,
          direction: direction,
          durationSeconds: isNaN(duration) ? null : duration,
          callStatus: callStatus || 'completed',
          fileSizeBytes: recording.buffer.length,
          savedPath: `Test-Data/recording/${agentName}/${finalFilename}`
        };

        if (fs.existsSync(filePath) && fs.statSync(filePath).size === recording.buffer.length) {
          totalRecordingsSkipped++;
          console.log(`\n   ⏩ [${agentName}] Existing: ${finalFilename}`);
        } else {
          fs.writeFileSync(filePath, recording.buffer);
          totalRecordingsDownloaded++;
          const kbSize = (recording.buffer.length / 1024).toFixed(1);
          console.log(`\n   ✅ [${agentName}] Downloaded: ${finalFilename} (${kbSize} KB) | Contact: "${contactName}" | Duration: ${duration || 'N/A'}s`);
        }

        agentFolders[agentName].manifest.push(fileRecord);
        overallManifest.push(fileRecord);
      }
    }
  }

  // Save manifests
  Object.entries(agentFolders).forEach(([agent, info]) => {
    fs.writeFileSync(path.join(info.folder, 'recordings_manifest.json'), JSON.stringify(info.manifest, null, 2));
  });

  fs.writeFileSync(path.join(baseOutputDir, 'recordings_manifest.json'), JSON.stringify(overallManifest, null, 2));

  console.log('\n\n====================================================');
  console.log('🎉 EXTRACTION COMPLETED (OPPORTUNITIES-ONLY)');
  console.log(`📋 Opportunities Checked       : ${opportunities.length}`);
  console.log(`📞 Call Events Checked         : ${totalCallsFound}`);
  console.log(`📥 Total Recordings Downloaded : ${totalRecordingsDownloaded}`);
  console.log(`⏩ Total Skipped (Existing)    : ${totalRecordingsSkipped}`);
  console.log(`📄 Total Filtered Recordings   : ${overallManifest.length}`);
  Object.entries(agentFolders).forEach(([agent, info]) => {
    console.log(`   📁 ${agent.padEnd(15)}: ${info.manifest.length} recordings -> ${info.folder}`);
  });
  console.log('====================================================\n');
}

extractOpportunitiesOnlyRecordings().catch((err) => {
  console.error('Fatal extraction error:', err);
  process.exit(1);
});
