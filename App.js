import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from './firebase';

export default function App() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const querySnapshot = await getDocs(collection(db, "users"));
        let adminFound = false;
        querySnapshot.forEach((doc) => {
          if (doc.id === u.uid && doc.data().role === 'admin') {
            adminFound = true;
          }
        });
        setIsAdmin(adminFound);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) return <View style={s.center}><ActivityIndicator color="#fff" size="large" /></View>;

  if (!user) return <LoginScreen />;

  if (!isAdmin) {
    return (
      <View style={s.center}>
        <Ionicons name="shield-half" size={60} color="#f87171" />
        <Text style={{ color: '#f87171', fontSize: 20, fontWeight: 'bold', marginTop: 20 }}>Доступ запрещен</Text>
        <Text style={{ color: '#888', marginTop: 10, textAlign: 'center' }}>У вашего аккаунта нет прав администратора.</Text>
        <TouchableOpacity onPress={() => signOut(auth)} style={s.btn}>
          <Text style={s.btnText}>Выйти</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AdminPanel />;
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
      <Text style={s.subtitle}>Вход для администраторов</Text>

      <TextInput style={s.input} placeholder="Почта" placeholderTextColor="#666" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={s.input} placeholder="Пароль" placeholderTextColor="#666" value={pass} onChangeText={setPass} secureTextEntry />

      <TouchableOpacity style={s.mainBtn} onPress={handleAuth}>
        <Text style={s.btnText}>Войти</Text>
      </TouchableOpacity>
    </View>
  );
}

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsers = async () => {
    setRefreshing(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleBlock = async (userId, currentStatus) => {
    try {
      await updateDoc(doc(db, "users", userId), { blocked: !currentStatus });
      fetchUsers();
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
  };

  const toggleRole = async (userId, currentRole) => {
    try {
      const newRole = currentRole === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, "users", userId), { role: newRole });
      fetchUsers();
    } catch (e) {
      Alert.alert('Ошибка', e.message);
    }
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Пользователи</Text>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <Ionicons name="log-out-outline" size={28} color="#f87171" />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ padding: 10 }}>
        {users.map((u) => (
          <View key={u.id} style={s.userCard}>
            <View style={{ flex: 1 }}>
              <Text style={s.userEmail}>{u.email}</Text>
              <Text style={s.userRole}>Роль: {u.role} | {u.blocked ? '🔴 ЗАБЛОКИРОВАН' : '🟢 Активен'}</Text>
            </View>
            
            <View style={s.actionRow}>
              <TouchableOpacity 
                style={[s.actionBtn, { backgroundColor: u.blocked ? '#34d399' : '#f87171' }]} 
                onPress={() => toggleBlock(u.id, u.blocked)}
              >
                <Text style={s.actionText}>{u.blocked ? 'Разблокировать' : 'Заблокировать'}</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[s.actionBtn, { backgroundColor: u.role === 'admin' ? '#fbbf24' : '#3b82f6', marginLeft: 8 }]} 
                onPress={() => toggleRole(u.id, u.role)}
              >
                <Text style={s.actionText}>{u.role === 'admin' ? 'Снять админа' : 'Сделать админом'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {users.length === 0 && !refreshing && <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>Нет пользователей</Text>}
      </ScrollView>

      <TouchableOpacity style={s.refreshBtn} onPress={fetchUsers}>
        <Ionicons name="refresh" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, backgroundColor: '#161a22' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  userCard: { backgroundColor: '#1c1c1e', padding: 15, borderRadius: 12, marginBottom: 10, flexDirection: 'column', gap: 12 },
  userEmail: { color: '#fff', fontSize: 16, fontWeight: '600' },
  userRole: { color: '#888', fontSize: 13, marginTop: 4 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionText: { color: '#000', fontSize: 13, fontWeight: 'bold' },
  refreshBtn: { position: 'absolute', bottom: 30, right: 30, backgroundColor: '#3b82f6', width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 5 },
});
