import { useState, useEffect } from "react";

type HeaderProps = {
  title: string;
};

function Header({ title }: HeaderProps) {
  const [user, setUser] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    try {
      const userStr = localStorage.getItem("erp_user");
      if (userStr) {
        setUser(JSON.parse(userStr));
      }
    } catch (e) { }
  }, []);

  return (
    <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <h2 style={{ margin: 0 }}>{title}</h2>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#1e293b', padding: '6px 15px', borderRadius: '20px', color: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}>
          <div style={{ width: '30px', height: '30px', backgroundColor: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px' }}>
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '14px', fontWeight: 'bold', lineHeight: '1' }}>{user.username}</span>
            <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1', marginTop: '4px' }}>{user.role}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;