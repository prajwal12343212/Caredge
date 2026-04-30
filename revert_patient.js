const fs = require('fs');

function revertPatientDashboard() {
  let content = fs.readFileSync('app/patient/dashboard/page.tsx', 'utf8');

  // Remove crypto imports
  content = content.replace('import * as crypto from "@/lib/crypto";\n', '');

  // Remove aesKey state
  content = content.replace(/const \[aesKey, setAesKey\] = useState<CryptoKey \| null>\(null\);\n\s*/g, '');

  // Simplify Auth Listener (remove RSA/AES logic)
  content = content.replace(/let currentAesKey: CryptoKey \| null = null;\s*try {.*?if \(!profileData\).*?\}\s*fetchData\(session\.user\.id, currentAesKey\);/gs, 
  `fetchData(session.user.id);`);
  content = content.replace(/if \(currentAesKey\) setAesKey\(currentAesKey\);/g, '');

  // Simplify fetchData signature and decryption
  content = content.replace(/const fetchData = async \(userId: string, key: CryptoKey\) => \{/g, 'const fetchData = async (userId: string) => {');
  
  // Decrypt replacements
  content = content.replace(/diagnosis: await crypto\.decryptDataCombined\(key, t\.diagnosis\)/g, 'diagnosis: t.diagnosis');
  content = content.replace(/prescription: await crypto\.decryptDataCombined\(key, t\.prescription\)/g, 'prescription: t.prescription');
  content = content.replace(/notes: t\.notes \? await crypto\.decryptDataCombined\(key, t\.notes\) : ""/g, 'notes: t.notes');

  content = content.replace(/allergies: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.allergies\)\)/g, 'allergies: p.allergies || []');
  content = content.replace(/chronic_diseases: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.chronic_diseases\)\)/g, 'chronic_diseases: p.chronic_diseases || []');
  content = content.replace(/current_medications: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.current_medications\)\)/g, 'current_medications: p.current_medications || []');
  content = content.replace(/past_surgeries: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.past_surgeries\)\)/g, 'past_surgeries: p.past_surgeries || []');
  content = content.replace(/family_history: await crypto\.decryptDataCombined\(key, p\.family_history\)/g, 'family_history: p.family_history');
  content = content.replace(/emergency_contact: await crypto\.decryptDataCombined\(key, p\.emergency_contact\)/g, 'emergency_contact: p.emergency_contact');

  // Simplify saveHealthProfile
  content = content.replace(/if \(!aesKey\) return toast\.error\("Encryption not initialized"\);\n\s*/g, '');
  content = content.replace(/const toastId = toast\.loading\("Encrypting and saving profile\.\.\."\);/g, 'const toastId = toast.loading("Saving profile...");');
  
  content = content.replace(/emergency_contact: await crypto\.encryptDataCombined\(aesKey, profileForm\.emergency_contact\)/g, 'emergency_contact: profileForm.emergency_contact');
  content = content.replace(/allergies: await crypto\.encryptDataCombined\(aesKey, JSON\.stringify\(profileForm\.allergies\.split\("\,"\)\.map\(\(s: string\) => s\.trim\(\)\)\.filter\(Boolean\)\)\)/g, 'allergies: profileForm.allergies.split(",").map((s: string) => s.trim()).filter(Boolean)');
  content = content.replace(/chronic_diseases: await crypto\.encryptDataCombined\(aesKey, JSON\.stringify\(profileForm\.chronic_diseases\.split\("\,"\)\.map\(\(s: string\) => s\.trim\(\)\)\.filter\(Boolean\)\)\)/g, 'chronic_diseases: profileForm.chronic_diseases.split(",").map((s: string) => s.trim()).filter(Boolean)');
  content = content.replace(/current_medications: await crypto\.encryptDataCombined\(aesKey, JSON\.stringify\(currentMedications\.map\(s => s\.trim\(\)\)\.filter\(Boolean\)\)\)/g, 'current_medications: currentMedications.map((s: string) => s.trim()).filter(Boolean)');
  content = content.replace(/past_surgeries: await crypto\.encryptDataCombined\(aesKey, JSON\.stringify\(profileForm\.past_surgeries\.split\("\,"\)\.map\(\(s: string\) => s\.trim\(\)\)\.filter\(Boolean\)\)\)/g, 'past_surgeries: profileForm.past_surgeries.split(",").map((s: string) => s.trim()).filter(Boolean)');
  content = content.replace(/family_history: await crypto\.encryptDataCombined\(aesKey, profileForm\.family_history\)/g, 'family_history: profileForm.family_history');
  
  content = content.replace(/fetchData\(user\.id, aesKey\);/g, 'fetchData(user.id);');

  // Simplify generateToken
  const tokenGenOld = `      // 1. Generate random Token Key (Symmetric Wrapper) — AES is fast
      const tokenKey = await crypto.generateAESKey();
      const tokenKeyB64 = await crypto.exportAESKey(tokenKey);
      
      // 2. Wrap the master AES Data Key with the Token Key
      const encryptedDataKeyCombined = await crypto.encryptKeyWithAESCombined(tokenKey, aesKey);

      // 3. Send to API
      const res = await fetch("/api/access/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          patientId: user.id, 
          durationHours: duration,
          encryptedDataKey: encryptedDataKeyCombined 
        })
      });
      const data = await res.json();
      if (data.rawToken) {
        // The shareable token is rawToken + "#" + TokenKey (base64)
        const fullToken = \`\${data.rawToken}#\${tokenKeyB64}\`;`;

  const tokenGenNew = `      const res = await fetch("/api/access/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: user.id, durationHours: duration })
      });
      const data = await res.json();
      if (data.token) {
        const fullToken = data.token.token;`;
  
  content = content.replace(tokenGenOld, tokenGenNew);

  // Simplify handleFileUpload
  const fileUploadOld = `    const toastId = toast.loading("Encrypting and uploading file...");

    reader.onload = async (event) => {
      if (!event.target?.result) return;
      
      try {
        const fileData = event.target.result as ArrayBuffer;
        
        // Encrypt the file data
        const { ciphertext, iv } = await crypto.encryptData(aesKey, fileData);
        
        // We send the encrypted base64 string to the API
        const formData = new FormData();
        formData.append("file_ciphertext", ciphertext);
        formData.append("iv", iv);
        formData.append("file_name", file.name);
        formData.append("patientId", user.id);
        formData.append("category", uploadCategory);

        const res = await fetch("/api/records", {
          method: "POST",
          body: formData
        });`;

  const fileUploadNew = `    const toastId = toast.loading("Uploading file...");

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = \`\${user.id}/\${Math.random()}.\${fileExt}\`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('health-records')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('health-records')
        .getPublicUrl(filePath);

      const res = await fetch("/api/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: user.id,
          fileUrl: publicUrl,
          fileName: file.name,
          fileType: fileExt
        })
      });`;
  
  content = content.replace(fileUploadOld, fileUploadNew);
  
  // Remove reader code block ending
  content = content.replace(/    reader\.readAsArrayBuffer\(file\);/g, '');
  content = content.replace(/      \} catch \(err\) \{/g, '    } catch (err) {');
  content = content.replace(/        console\.error\(err\);\n        toast\.error\("Upload failed", \{ id: toastId \}\);\n      \}\n    \};\n/g, '      console.error(err);\n      toast.error("Upload failed", { id: toastId });\n    }\n');
  content = content.replace(/if \(!e\.target\.files \|\| !e\.target\.files\[0\] \|\| !aesKey\) return;/g, 'if (!e.target.files || !e.target.files[0]) return;');

  fs.writeFileSync('app/patient/dashboard/page.tsx', content);
}

revertPatientDashboard();
console.log("Patient dashboard updated");
