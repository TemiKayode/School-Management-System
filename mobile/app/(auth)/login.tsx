import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
  ScrollView, TextInput as TextInputType, Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

const DEMO_CREDENTIALS = [
  { role: 'Admin', email: 'admin@school.com', password: 'Admin@123', color: '#7c3aed' },
  { role: 'Teacher', email: 'teacher@school.com', password: 'Admin@123', color: '#2563eb' },
  { role: 'Student', email: 'student@school.com', password: 'Admin@123', color: '#059669' },
];

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const passwordRef = useRef<TextInputType>(null);
  const { setAuth } = useAuthStore();

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email: email.trim().toLowerCase(), password });
      const { user, accessToken, refreshToken } = res.data.data;
      setAuth(user, accessToken, refreshToken);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      Alert.alert('Login failed', err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (cred: typeof DEMO_CREDENTIALS[number]) => {
    setEmail(cred.email);
    setPassword(cred.password);
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branded header */}
        <View style={styles.header}>
          <View style={styles.logoWrap}>
            <View style={styles.logo}>
              <Text style={styles.logoEmoji}>🎓</Text>
            </View>
            {/* Decorative blobs */}
            <View style={[styles.blob, { top: -30, right: -20, width: 100, height: 100 }]} />
            <View style={[styles.blob, { bottom: -20, left: -30, width: 80, height: 80, opacity: 0.15 }]} />
          </View>
          <Text style={styles.brand}>SchoolMS</Text>
          <Text style={styles.tagline}>Your school, at your fingertips</Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSub}>Sign in to your account</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email address</Text>
            <TextInput
              style={[styles.input, focused === 'email' && styles.inputFocused]}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="you@school.com"
              placeholderTextColor="#d1d5db"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Password</Text>
              <TouchableOpacity>
                <Text style={styles.forgotLink}>Forgot?</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.passwordWrap}>
              <TextInput
                ref={passwordRef}
                style={[styles.input, styles.passwordInput, focused === 'password' && styles.inputFocused]}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="••••••••"
                placeholderTextColor="#d1d5db"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
              />
              <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(v => !v)}>
                <Text style={styles.eyeText}>{showPassword ? '🙈' : '👁️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.signInText}>Sign in</Text>
            }
          </TouchableOpacity>
        </View>

        {/* Demo quick-fill */}
        <View style={styles.demoSection}>
          <Text style={styles.demoHeading}>Quick demo login</Text>
          <View style={styles.demoGrid}>
            {DEMO_CREDENTIALS.map(cred => (
              <Pressable
                key={cred.role}
                style={({ pressed }) => [styles.demoChip, { borderColor: cred.color, opacity: pressed ? 0.7 : 1 }]}
                onPress={() => fillDemo(cred)}
              >
                <View style={[styles.demoChipDot, { backgroundColor: cred.color }]} />
                <Text style={[styles.demoChipText, { color: cred.color }]}>{cred.role}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.demoHint}>Tap a role above to fill in credentials</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f3ff' },
  scroll: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 40 },

  header: { alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 72 : 52, paddingBottom: 32 },
  logoWrap: { position: 'relative', marginBottom: 16 },
  logo: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', shadowColor: '#6366f1', shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 },
  logoEmoji: { fontSize: 38 },
  blob: { position: 'absolute', backgroundColor: '#818cf8', borderRadius: 50, opacity: 0.2 },
  brand: { fontSize: 28, fontWeight: '800', color: '#4338ca', letterSpacing: -0.5 },
  tagline: { fontSize: 14, color: '#818cf8', marginTop: 4 },

  card: { backgroundColor: '#fff', borderRadius: 24, padding: 24, shadowColor: '#6366f1', shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardSub: { fontSize: 14, color: '#9ca3af', marginBottom: 24 },

  fieldGroup: { marginBottom: 18 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 7 },
  forgotLink: { fontSize: 12, color: '#6366f1', fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 15, color: '#111827', backgroundColor: '#fafafa',
  },
  inputFocused: { borderColor: '#6366f1', backgroundColor: '#fff' },
  passwordWrap: { position: 'relative' },
  passwordInput: { paddingRight: 46 },
  eyeBtn: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
  eyeText: { fontSize: 18 },

  signInBtn: { backgroundColor: '#6366f1', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: '#6366f1', shadowOpacity: 0.35, shadowRadius: 8, elevation: 4 },
  signInBtnDisabled: { opacity: 0.6 },
  signInText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },

  demoSection: { marginTop: 28, alignItems: 'center' },
  demoHeading: { fontSize: 12, fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  demoGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center' },
  demoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#fff' },
  demoChipDot: { width: 7, height: 7, borderRadius: 4 },
  demoChipText: { fontSize: 13, fontWeight: '700' },
  demoHint: { marginTop: 10, fontSize: 11, color: '#d1d5db' },
});
