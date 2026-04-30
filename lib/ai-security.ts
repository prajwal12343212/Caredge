import { supabaseServer } from "./supabase-server";

export type ThreatType = 
  | "FAILED_LOGIN" 
  | "INVALID_TOKEN" 
  | "EXPIRED_TOKEN_REUSE" 
  | "UNAUTHORIZED_ACTION"
  | "SCREENSHOT_ATTEMPT"
  | "SUSPICIOUS_BEHAVIOR";

export interface AIThreatEvaluationParams {
  userId: string;
  userRole: string;
  action: string;
  ipAddress?: string;
  description: string;
  patientId?: string; // Target patient for the threat (e.g. if doctor takes screenshot)
}

// AI Rules & Scoring Engine
const analyzeRiskScore = (action: string): { score: number, threatType?: ThreatType, severity?: 'low' | 'medium' | 'high' | 'critical' } => {
  switch (action) {
    case "SCREENSHOT_ATTEMPT":
      return { score: 15, threatType: "SCREENSHOT_ATTEMPT", severity: "medium" };
    case "INVALID_TOKEN":
      return { score: 15, threatType: "INVALID_TOKEN", severity: "medium" };
    case "TOKEN_REPLAY_REJECTED":
    case "EXPIRED_TOKEN_REUSE":
      return { score: 20, threatType: "EXPIRED_TOKEN_REUSE", severity: "high" };
    case "UNAUTHORIZED_ACCESS":
      return { score: 25, threatType: "UNAUTHORIZED_ACTION", severity: "critical" };
    case "FAILED_LOGIN": // No longer detecting this as a suspicious activity threat
      return { score: 0 };
    default:
      return { score: 0 };
  }
};

export async function evaluateAITThreat(params: AIThreatEvaluationParams) {
  console.log("AI Threat Engine: Evaluating action", params.action, "for user", params.userId);
  try {
    const analysis = analyzeRiskScore(params.action);
    console.log("AI Threat Engine: Risk analysis", analysis);
    
    // Only proceed if it's a risky action
    if (analysis.score === 0) {
      console.log("AI Threat Engine: Action not risky, skipping.");
      return;
    }

    // 1. Fetch current risk score
    let { data: riskRecord } = await supabaseServer
      .from('user_risk_scores')
      .select('total_score')
      .eq('user_id', params.userId)
      .single();

    let newTotalScore = (riskRecord?.total_score || 0) + analysis.score;

    // 2. Update Risk Score
    if (riskRecord) {
      await supabaseServer
        .from('user_risk_scores')
        .update({ 
          total_score: newTotalScore,
          last_evaluated_at: new Date().toISOString()
        })
        .eq('user_id', params.userId);
    } else {
      await supabaseServer
        .from('user_risk_scores')
        .insert({
          user_id: params.userId,
          total_score: newTotalScore
        });
    }

    // 3. Anomaly Detection (Lightweight AI Logic)
    // Check if the user has triggered the SAME action multiple times recently
    const { data: recentLogs } = await supabaseServer
      .from('audit_logs')
      .select('action, created_at')
      .eq('actor_id', params.userId)
      .eq('action', params.action)
      .order('created_at', { ascending: false })
      .limit(5);

    let isAnomaly = false;
    let anomalyDescription = params.description;

    if (recentLogs && recentLogs.length >= 3) {
      // If 3 of the same risky actions happened in the last 15 minutes, it's an anomaly.
      const oldestLogTime = new Date(recentLogs[recentLogs.length - 1].created_at).getTime();
      const now = new Date().getTime();
      const diffMinutes = (now - oldestLogTime) / (1000 * 60);
      
      if (diffMinutes < 15) {
        isAnomaly = true;
        anomalyDescription = `ANOMALY DETECTED: Repeated ${params.action} (${recentLogs.length} times in 15 mins). Original description: ${params.description}`;
        newTotalScore += 40; // Massive penalty for repeated brute-force/abuse
        
        // Update score again for the anomaly penalty
        await supabaseServer
          .from('user_risk_scores')
          .update({ 
            total_score: newTotalScore,
            last_evaluated_at: new Date().toISOString()
          })
          .eq('user_id', params.userId);
      }
    }

    // 4. Log Security Incident
    if (analysis.threatType || isAnomaly) {
      console.log("AI Threat Engine: Logging security incident...");
      
      // Log for the actor (Doctor or Patient)
      const { error: actorError } = await supabaseServer
        .from('security_incidents')
        .insert({
          user_id: params.userId,
          user_role: params.userRole,
          threat_type: isAnomaly ? 'SUSPICIOUS_BEHAVIOR' : analysis.threatType,
          severity: isAnomaly ? 'critical' : analysis.severity,
          risk_score: isAnomaly ? analysis.score + 40 : analysis.score,
          description: anomalyDescription,
          ip_address: params.ipAddress || 'unknown'
        });

      if (actorError) console.error("AI Threat Engine: Actor Incident Error:", actorError);

      // Special Case: If doctor took a screenshot of a patient, log it for the PATIENT as well
      if (params.userRole === 'doctor' && params.action === 'SCREENSHOT_ATTEMPT' && params.patientId) {
        console.log("AI Threat Engine: Logging patient-side alert for doctor screenshot...");
        const { error: patientError } = await supabaseServer
          .from('security_incidents')
          .insert({
            user_id: params.patientId,
            user_role: 'patient',
            threat_type: 'SCREENSHOT_ATTEMPT',
            severity: 'high',
            risk_score: 20,
            description: `Security Alert: A doctor (${params.description}) was detected taking a screenshot of your health profile.`,
            ip_address: params.ipAddress || 'unknown'
          });
        
        if (patientError) console.error("AI Threat Engine: Patient Incident Error:", patientError);
      }
    }

  } catch (error) {
    console.error("AI Threat Engine Error:", error);
  }
}
