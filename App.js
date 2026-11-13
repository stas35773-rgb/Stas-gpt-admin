import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebase';

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const querySnapshot = await getDocs(collection(db, "users"));
        querySnapshot.forEach((doc) => {
          if (doc.id === u.uid) {
            setRole(doc.data().role);
          }
        });
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#fff" size="large" /></View>;

  if (!user) return <LoginScreen />;

  if (role !== 'admin' && role !== 'developer') {
    return (
      <View style={s.center}>
        <Ionicons name="shield-half" size={60} color="#f87171" />
        <Text style={{ color: '#f87171', fontSize: 20, fontWeight: 'bold', marginTop: 20 }}>Доступ запрещен</Text>
        <Text style={{ color: '#888', marginTop: 10, textAlign: 'center' }}>У вас нет прав администратора или разработчика.</Text>
        <TouchableOpacity onPress={() => signOut(auth)} style={s.btn}>
          <Text style={s.btnText}>Выйти</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Передаем UID текущего пользователя в Dashboard
  return <Dashboard role={role} currentUid={user.uid} />;
}

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handleAuth = async () => {
    if (!email || !pass) return Alert.alert('Ошибка', 'Заполните все поля');
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
  };

  return (
    <View style={s.authContainer}>
      <Ionicons name="shield-checkmark" size={80} color="#fff" style={{ alignSelf: 'center', marginBottom: 20 }} />
      <Text style={s.titleLogo}>Stas Admin</Text>
      <Text style={s.subtitle}>Вход для персонала</Text>
      <TextInput style={s.input} placeholder="Почта" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Пароль" placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />
      <TouchableOpacity style={s.mainBtn} onPress={handleAuth}>
        <Text style={s.btnText}>Войти</Text>
      </TouchableOpacity>
    </View>
  );
}

function Dashboard({ role, currentUid }) {
  const [activeTab, setActiveTab] = useState('users');

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Панель ({role.toUpperCase()})</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={28} color="#f87171" />
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, activeTab === 'users' && s.activeTab]} onPress={() => setActiveTab('users')}>
          <Ionicons name="people" size={20} color={activeTab === 'users' ? '#000' : '#888'} />
          <Text style={[s.tabText, activeTab === 'users' && {color: '#000'}]}>Пользователи</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, activeTab === 'chats' && s.activeTab]} onPress={() => setActiveTab('chats')}>
          <Ionicons name="chatbubbles" size={20} color={activeTab === 'chats' ? '#000' : '#888'} />
          <Text style={[s.tabText, activeTab === 'chats' && {color: '#000'}]}>Чаты</Text>
        </TouchableOpacity>
      </View>

      {/* Передаем currentUid дальше в UsersTab */}
      {activeTab === 'users' ? <UsersTab currentUserRole={role} currentUid={currentUid} /> : <ChatsTab />}
    </View>
  );
}

function UsersTab({ currentUserRole, currentUid }) {
  const [users, setUsers] = useState([]);

  const fetchUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    setUsers(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  useEffect(() => { fetchUsers(); }, []);

  const toggleBlock = async (userId, currentStatus) => {
    await updateDoc(doc(db, "users", userId), { blocked: !currentStatus });
    fetchUsers();
  };

  const toggleRole = async (targetUserId, targetRole) => {
    if (currentUserRole === 'admin' && targetRole === 'developer') {
      return Alert.alert('Ошибка', 'Администратор не может изменить роль разработчика.');
    }

    let newRole = 'user';
    if (targetRole === 'user') newRole = 'admin';
    else if (targetRole === 'admin') newRole = 'user';
    else if (targetRole === 'developer') newRole = 'admin';

    await updateDoc(doc(db, "users", targetUserId), { role: newRole });
    fetchUsers();
  };

  // Проверка: можно ли менять роль этому пользователю?
  const canChangeRole = (targetRole, targetUid) => {
    // ЖЕЛЕЗНОЕ ПРАВИЛО: Нельзя менять роль самому себе!
    if (targetUid === currentUid) return false;

    // Разработчик может менять всех (кроме себя)
    if (currentUserRole === 'developer') return true; 
    // Админ может менять всех, кроме разработчиков (и себя)
    if (currentUserRole === 'admin' && targetRole !== 'developer') return true; 
    return false;
  };

  return (
    <ScrollView style={{ padding: 10 }}>
      {users.map((u) => (
        <View key={u.id} style={s.userCard}>
          <View style={{ flex: 1 }}>
            <Text style={s.userEmail}>
              {u.email} {u.id === currentUid ? '(Вы)' : ''}
            </Text>
            <Text style={s.userRole}>
              Роль: <Text style={{color: u.role === 'developer' ? '#6ee7b7' : u.role === 'admin' ? '#fbbf24' : '#888'}}>{u.role.toUpperCase()}</Text> 
              {u.blocked ? ' | 🔴 Заблокирован' : ' | 🟢 Активен'}
            </Text>
          </View>
          
          <View style={s.actionRow}>
            {/* Блокировка (скрываем кнопку, если это ты сам, чтобы случайно не забанить себя) */}
            {u.id !== currentUid && (
              <TouchableOpacity 
                style={[s.actionBtn, { backgroundColor: u.blocked ? '#34d399' : '#f87171' }]} 
                onPress={() => toggleBlock(u.id, u.blocked)}
              >
                <Text style={s.actionText}>{u.blocked ? 'Разблокировать' : 'Блок'}</Text>
              </TouchableOpacity>
            )}

            {/* Смена роли (скрываем кнопку, если это ты сам) */}
            {canChangeRole(u.role, u.id) && (
              <TouchableOpacity 
                style={[s.actionBtn, { 
                  backgroundColor: u.role === 'admin' ? '#fbbf24' : (u.role === 'developer' ? '#f87171' : '#3b82f6'), 
                  marginLeft: 8 
                }]} 
                onPress={() => toggleRole(u.id, u.role)}
              >
                <Text style={s.actionText}>
                  {u.role === 'user' ? 'Сделать админом' : u.role === 'admin' ? 'Снять админа' : 'Снять разраба'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function ChatsTab() {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    const fetchChats = async () => {
      const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      setChats(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchChats();
  }, []);

  return (
    <ScrollView style={{ padding: 10 }}>
      {chats.length === 0 && <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>Пока нет переписок</Text>}
      {chats.map((c) => (
        <View key={c.id} style={s.chatCard}>
          <Text style={s.chatMeta}>{c.email} · {c.model?.toUpperCase()}</Text>
          <Text style={s.chatQ}>Q: {c.question}</Text>
          <Text style={s.chatA}>A: {c.answer}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', alignItems: 'center', padding: 20 },
  authContainer: { flex: 1, backgroundColor: '#0f1115', justifyContent: 'center', padding: 24 },
  titleLogo: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { color: '#888', fontSize: 16, textAlign: 'center', marginBottom: 32 },
  input: { backgroundColor: '#1c1c1e', color: '#fff', padding: 16, borderRadius: 12, marginBottom: 12 },
  mainBtn: { backgroundColor: '#fff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 16 },
  btn: { marginTop: 20, padding: 15, backgroundColor: '#1c1c1e', borderRadius: 10 },
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#161a22' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  tabs: { flexDirection: 'row', backgroundColor: '#161a22', paddingHorizontal: 10, paddingBottom: 10, gap: 10 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 10, backgroundColor: '#1c1c1e', gap: 8 },
  activeTab: { backgroundColor: '#fff' },
  tabText: { color: '#888', fontWeight: 'bold' },
  userCard: { backgroundColor: '#1c1c1e', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'column', gap: 12 },
  userEmail: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userRole: { color: '#888', fontSize: 13, marginTop: 4 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionText: { color: '#000', fontSize: 13, fontWeight: 'bold' },
  chatCard: { backgroundColor: '#1c1c1e', padding: 15, borderRadius: 12, marginBottom: 10 },
  chatMeta: { color: '#6ee7b7', fontSize: 12, marginBottom: 5 },
  chatQ: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginBottom: 5 },
  chatA: { color: '#aaa', fontSize: 14, fontStyle: 'italic' },
});
