const fs = require('fs');

function revertDoctorDashboard() {
  let content = fs.readFileSync('app/doctor/dashboard/page.tsx', 'utf8');

  // Remove crypto imports
  content = content.replace('import * as crypto from "@/lib/crypto";\n', '');

  // Remove aesKey state
  content = content.replace(/const \[aesKey, setAesKey\] = useState<CryptoKey \| null>\(null\);\n\s*/g, '');

  // Simplify validateToken
  const validateOld = `    try {
      // 1. Split token to get ID and Symmetric Wrapping Key
      const [tokenUuid, tokenKeyB64] = tokenInput.split("#");
      
      if (!tokenUuid || !tokenKeyB64) {
        throw new Error("Invalid token format. Missing E2EE key component.");
      }

      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenUuid, doctorId: user.id })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Invalid token");
      }
      
      // 2. Decrypt the Patient's AES Data Key using the Token Key from the input
      const tokenKey = await crypto.importAESKey(tokenKeyB64);
      const decryptedAesKey = await crypto.decryptKeyWithAESCombined(tokenKey, data.token.encrypted_data_key);
      
      setAesKey(decryptedAesKey);
      setActiveSession(data);
      
      fetchPatientRecords(data.token.patient_id, decryptedAesKey);
      fetchPatientTreatments(data.token.patient_id, decryptedAesKey);
      fetchPatientProfile(data.token.patient_id, decryptedAesKey);
      fetchDoctorLogs(user.id); 
      
      toast.success("E2EE Connection Established", { id: toastId });
      
    } catch (err: any) {
      console.error(err);
      toast.error(err.message, { id: toastId });
      setActiveSession(null);
      setAesKey(null);
    }`;

  const validateNew = `    try {
      const res = await fetch("/api/access/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenInput, doctorId: user.id })
      });
      
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Invalid token");
      
      setActiveSession(data);
      
      fetchPatientRecords(data.token.patient_id);
      fetchPatientTreatments(data.token.patient_id);
      fetchPatientProfile(data.token.patient_id);
      fetchDoctorLogs(user.id);
      
      toast.success("Connection Established", { id: toastId });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message, { id: toastId });
      setActiveSession(null);
    }`;

  content = content.replace(validateOld, validateNew);

  // Simplify fetchPatientRecords
  content = content.replace(/const fetchPatientRecords = async \(patientId: string, key: CryptoKey\) => \{/g, 'const fetchPatientRecords = async (patientId: string) => {');

  // Simplify fetchPatientTreatments
  content = content.replace(/const fetchPatientTreatments = async \(patientId: string, key: CryptoKey\) => \{/g, 'const fetchPatientTreatments = async (patientId: string) => {');
  
  content = content.replace(/diagnosis: await crypto\.decryptDataCombined\(key, t\.diagnosis\)/g, 'diagnosis: t.diagnosis');
  content = content.replace(/prescription: await crypto\.decryptDataCombined\(key, t\.prescription\)/g, 'prescription: t.prescription');
  content = content.replace(/notes: t\.notes \? await crypto\.decryptDataCombined\(key, t\.notes\) : ""/g, 'notes: t.notes');

  // Simplify fetchPatientProfile
  content = content.replace(/const fetchPatientProfile = async \(patientId: string, key: CryptoKey\) => \{/g, 'const fetchPatientProfile = async (patientId: string) => {');
  
  content = content.replace(/allergies: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.allergies\)\)/g, 'allergies: p.allergies || []');
  content = content.replace(/chronic_diseases: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.chronic_diseases\)\)/g, 'chronic_diseases: p.chronic_diseases || []');
  content = content.replace(/current_medications: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.current_medications\)\)/g, 'current_medications: p.current_medications || []');
  content = content.replace(/past_surgeries: JSON\.parse\(await crypto\.decryptDataCombined\(key, p\.past_surgeries\)\)/g, 'past_surgeries: p.past_surgeries || []');
  content = content.replace(/family_history: await crypto\.decryptDataCombined\(key, p\.family_history\)/g, 'family_history: p.family_history');
  content = content.replace(/emergency_contact: await crypto\.decryptDataCombined\(key, p\.emergency_contact\)/g, 'emergency_contact: p.emergency_contact');

  // Simplify handleAddTreatment
  const addTreatmentOld = `  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired || !aesKey) return toast.error("Session expired or key missing");
    
    setIsSubmitting(true);
    const toastId = toast.loading("Encrypting and saving treatment...");
    
    try {
      const res = await fetch("/api/treatment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: user.id,
          patientId: activeSession.token.patient_id,
          tokenId: activeSession.token.id,
          // Encrypt treatment data
          diagnosis: await crypto.encryptDataCombined(aesKey, diagnosis),
          prescription: await crypto.encryptDataCombined(aesKey, prescription),
          notes: await crypto.encryptDataCombined(aesKey, notes)
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Treatment encrypted and saved!", { id: toastId });
      setDiagnosis("");
      setPrescription("");
      setNotes("");
      
      fetchPatientTreatments(activeSession.token.patient_id, aesKey);`;

  const addTreatmentNew = `  const handleAddTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isExpired) return toast.error("Session expired");
    
    setIsSubmitting(true);
    const toastId = toast.loading("Saving treatment...");
    
    try {
      const res = await fetch("/api/treatment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: user.id,
          patientId: activeSession.token.patient_id,
          tokenId: activeSession.token.id,
          diagnosis,
          prescription,
          notes
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Treatment saved!", { id: toastId });
      setDiagnosis("");
      setPrescription("");
      setNotes("");
      
      fetchPatientTreatments(activeSession.token.patient_id);`;

  content = content.replace(addTreatmentOld, addTreatmentNew);

  fs.writeFileSync('app/doctor/dashboard/page.tsx', content);
}

revertDoctorDashboard();
console.log("Doctor dashboard updated");
