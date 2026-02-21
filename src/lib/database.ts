declare global {
  interface Window { initSqlJs: any; }
}

export class Database {
  db: any = null;

  async init() {
    const SQL = await window.initSqlJs({
      locateFile: (f: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${f}`
    });
    const saved = localStorage.getItem('phishguard_db');
    if (saved) {
      try {
        const buf = Uint8Array.from(atob(saved), c => c.charCodeAt(0));
        this.db = new SQL.Database(buf);
      } catch {
        this.db = new SQL.Database();
      }
    } else {
      this.db = new SQL.Database();
    }
    this.createTables();
    this.seedData();
  }

  save() {
    const data = this.db.export();
    const arr = new Uint8Array(data);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < arr.length; i += chunkSize) {
      binary += String.fromCharCode(...arr.subarray(i, i + chunkSize));
    }
    localStorage.setItem('phishguard_db', btoa(binary));
  }

  run(sql: string, params: any[] = []) {
    this.db.run(sql, params);
    this.save();
  }

  exec(sql: string) {
    this.db.exec(sql);
  }

  query(sql: string, params: any[] = []): any[] {
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }

  queryOne(sql: string, params: any[] = []): any {
    return this.query(sql, params)[0] || null;
  }

  createTables() {
    this.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar_color TEXT DEFAULT '#00f5ff',
        role TEXT DEFAULT 'user',
        status TEXT DEFAULT 'active',
        total_scans INTEGER DEFAULT 0,
        alerts_triggered INTEGER DEFAULT 0,
        joined_date TEXT,
        last_login TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS scan_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT NOT NULL,
        status TEXT NOT NULL,
        risk_score INTEGER NOT NULL,
        ai_confidence INTEGER,
        domain_age TEXT,
        ssl_status TEXT,
        redirect_count INTEGER,
        blacklisted INTEGER DEFAULT 0,
        threat_level TEXT,
        threat_indicators TEXT,
        scanned_by INTEGER,
        username TEXT,
        user_email TEXT,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scanned_by) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS admin_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        url TEXT,
        status TEXT,
        risk_score INTEGER,
        reported_by TEXT,
        user_email TEXT,
        message TEXT,
        is_read INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS login_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        username TEXT,
        login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        device TEXT DEFAULT 'Web Browser',
        ip_address TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS blacklist (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT UNIQUE NOT NULL,
        added_by TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  }

  seedData() {
    const count = this.queryOne('SELECT COUNT(*) as c FROM users');
    if (count && count.c > 0) return;

    this.exec(`
      INSERT INTO users (full_name,email,username,password,avatar_color,role,status,total_scans,alerts_triggered,joined_date,last_login) VALUES
      ('John Doe','john@email.com','john_doe','John@123','#00f5ff','user','active',47,3,'2024-01-15','2024-12-10 09:14'),
      ('Sarah Khan','sarah@email.com','sarah_k','Sarah@456','#7c3aed','user','active',23,1,'2024-02-20','2024-12-09 14:30'),
      ('Ravi Sharma','ravi@email.com','ravi_s','Ravi@789','#00ff88','user','active',89,5,'2024-03-10','2024-12-08 11:20'),
      ('Priya Patel','priya@email.com','priya_p','Priya@321','#ff6b35','user','inactive',12,0,'2024-04-05','2024-11-20 08:00'),
      ('Mike Wilson','mike@email.com','mike_w','Mike@654','#f59e0b','user','active',61,2,'2024-05-18','2024-12-10 16:45'),
      ('Ananya Roy','ananya@email.com','ananya_r','Ananya@111','#ec4899','user','active',34,1,'2024-06-22','2024-12-07 13:10'),
      ('Carlos Diaz','carlos@email.com','carlos_d','Carlos@222','#06b6d4','user','inactive',5,0,'2024-07-30','2024-10-15 10:30'),
      ('Meera Nair','meera@email.com','meera_n','Meera@333','#8b5cf6','user','active',72,4,'2024-08-14','2024-12-10 17:00');

      INSERT INTO scan_history (url,status,risk_score,ai_confidence,domain_age,ssl_status,redirect_count,blacklisted,threat_level,threat_indicators,username,user_email,scanned_by) VALUES
      ('http://paypal-login-verify.tk/secure','PHISHING',91,94,'3 days','Invalid',5,1,'CRITICAL','["Domain registered < 30 days","Invalid SSL","Found on 3+ blacklists","Suspicious redirect chain","Phishing URL pattern"]','john_doe','john@email.com',1),
      ('https://google.com','SAFE',5,99,'15 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','sarah_k','sarah@email.com',2),
      ('http://amazon-offer-win.xyz/claim','PHISHING',87,91,'7 days','Invalid',4,1,'CRITICAL','["Domain registered < 30 days","Invalid SSL","Found on 3+ blacklists","Suspicious redirect chain"]','ravi_s','ravi@email.com',3),
      ('https://github.com','SAFE',3,99,'14 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','mike_w','mike@email.com',5),
      ('http://hdfc-bank-update.site/login','PHISHING',93,96,'2 days','Invalid',6,1,'CRITICAL','["Domain registered < 30 days","Invalid SSL","Found on 3+ blacklists","Suspicious redirect chain","Phishing URL pattern"]','john_doe','john@email.com',1),
      ('http://win-iphone-now.click/free','SUSPICIOUS',72,83,'15 days','Invalid',3,0,'HIGH','["Recently registered domain","Unusual URL pattern","Partial SSL issues"]','ananya_r','ananya@email.com',6),
      ('https://stackoverflow.com','SAFE',2,99,'18 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','meera_n','meera@email.com',8),
      ('http://netflix-billing-issue.pw/update','PHISHING',89,93,'5 days','Invalid',5,1,'CRITICAL','["Domain registered < 30 days","Invalid SSL","Found on 3+ blacklists","Suspicious redirect chain"]','carlos_d','carlos@email.com',7),
      ('https://youtube.com','SAFE',4,99,'20 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','priya_p','priya@email.com',4),
      ('http://sbi-kyc-alert.info/verify','PHISHING',95,97,'1 day','Invalid',7,1,'CRITICAL','["Domain registered < 30 days","Invalid SSL","Found on 3+ blacklists","Suspicious redirect chain","Phishing URL pattern"]','ravi_s','ravi@email.com',3),
      ('http://crypto-double.money/invest','SUSPICIOUS',68,79,'20 days','Invalid',3,0,'HIGH','["Recently registered domain","Unusual URL pattern","Partial SSL issues"]','sarah_k','sarah@email.com',2),
      ('https://linkedin.com','SAFE',6,99,'16 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','mike_w','mike@email.com',5),
      ('http://whatsapp-prize.ga/claim','PHISHING',88,92,'8 days','Invalid',4,1,'CRITICAL','["Domain registered < 30 days","Invalid SSL","Found on 3+ blacklists"]','john_doe','john@email.com',1),
      ('https://anthropic.com','SAFE',8,99,'5 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','ananya_r','ananya@email.com',6),
      ('http://free-recharge-trick.cf/now','SUSPICIOUS',61,75,'25 days','Invalid',2,0,'MEDIUM','["Recently registered domain","Unusual URL pattern"]','meera_n','meera@email.com',8),
      ('https://amazon.com','SAFE',7,99,'25 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','ravi_s','ravi@email.com',3),
      ('http://instagram-verify-now.tk/account','PHISHING',84,90,'10 days','Invalid',5,1,'CRITICAL','["Domain registered < 30 days","Invalid SSL","Found on 3+ blacklists","Phishing URL pattern"]','sarah_k','sarah@email.com',2),
      ('https://microsoft.com','SAFE',5,99,'30 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','carlos_d','carlos@email.com',7),
      ('http://ubi-loan-offer.online/apply','SUSPICIOUS',55,70,'30 days','Partial',2,0,'MEDIUM','["Recently registered domain","Unusual URL pattern"]','priya_p','priya@email.com',4),
      ('https://cloudflare.com','SAFE',3,99,'18 years','Valid',0,0,'LOW','["Valid SSL certificate","Established domain","Clean blacklist check"]','meera_n','meera@email.com',8);

      INSERT INTO admin_alerts (type,url,status,risk_score,reported_by,user_email,is_read) VALUES
      ('url_threat','http://paypal-login-verify.tk/secure','PHISHING',91,'john_doe','john@email.com',0),
      ('url_threat','http://amazon-offer-win.xyz/claim','PHISHING',87,'ravi_s','ravi@email.com',0),
      ('url_threat','http://win-iphone-now.click/free','SUSPICIOUS',72,'ananya_r','ananya@email.com',0),
      ('url_threat','http://hdfc-bank-update.site/login','PHISHING',93,'john_doe','john@email.com',0),
      ('url_threat','http://sbi-kyc-alert.info/verify','PHISHING',95,'ravi_s','ravi@email.com',1),
      ('url_threat','http://crypto-double.money/invest','SUSPICIOUS',68,'sarah_k','sarah@email.com',1);
      INSERT INTO admin_alerts (type,message,reported_by,user_email,is_read) VALUES
      ('new_user','New user registered: Meera Nair (@meera_n)','meera_n','meera@email.com',1);

      INSERT INTO blacklist (domain, added_by) VALUES
      ('paypal-login-verify.tk','System'),
      ('amazon-offer-win.xyz','System'),
      ('hdfc-bank-update.site','System'),
      ('sbi-kyc-alert.info','System');

      INSERT OR REPLACE INTO system_settings (key, value) VALUES
      ('api_key','pg-api-xxxxxxxxxxxxxxxxxxxxxxxx'),
      ('sensitivity','7'),
      ('auto_block','true'),
      ('alert_threshold','65'),
      ('maintenance','false'),
      ('retention_days','90');
    `);
    this.save();
  }
}

export const ADMIN_EMAILS: Record<string, { name: string; level: string }> = {
  'vishnubabalsure@gmail.com': { name: 'Vishnu Babalsure', level: 'Super Admin' },
  'nileshchatap25@gmail.com': { name: 'Nilesh Chatap', level: 'Admin' },
};

export function generateRiskScore(): number {
  const r = Math.random();
  if (r < 0.6) return Math.floor(Math.random() * 30);
  if (r < 0.8) return Math.floor(31 + Math.random() * 34);
  return Math.floor(66 + Math.random() * 34);
}

export function getIndicators(status: string): string[] {
  if (status === 'SAFE') return ['Valid SSL certificate', 'Established domain', 'Clean blacklist check'];
  if (status === 'SUSPICIOUS') return ['Recently registered domain', 'Unusual URL pattern', 'Partial SSL issues'];
  return ['Domain registered < 30 days', 'Invalid SSL', 'Found on 3+ blacklists', 'Suspicious redirect chain', 'Phishing URL pattern'];
}

export function checkStrength(p: string) {
  let s = 0;
  if (p.length >= 8) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[!@#$%^&*]/.test(p)) s++;
  return { score: s, level: ['', 'Weak', 'Weak', 'Medium', 'Strong'][s], color: s <= 2 ? '#ff003c' : s === 3 ? '#f59e0b' : '#00ff88' };
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  return user.charAt(0) + '****' + user.charAt(user.length - 1) + '@' + domain;
}
