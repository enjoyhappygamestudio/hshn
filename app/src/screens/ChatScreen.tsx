import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from '../constants/theme';
import { Message, Conversation } from '../types';
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  sendMessage,
} from '../services/api';
import { BackButton } from '../components/BackButton';

interface ChatScreenProps {
  navigation: any;
  route: any;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ navigation, route }) => {
  const conversationId = route.params?.conversationId;
  const [convId, setConvId] = useState<string | null>(conversationId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [mode, setMode] = useState<'list' | 'chat'>(conversationId ? 'chat' : 'list');
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (mode === 'list') loadConversations();
    else if (convId) loadMessages();
  }, [mode, convId]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!convId) return;
    setLoading(true);
    try {
      const data = await fetchMessages(convId);
      setMessages(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleNewChat = useCallback(async () => {
    if (!input.trim()) return;
    setSending(true);
    try {
      const conv = await createConversation('Hỗ trợ từ khách hàng', input.trim());
      setConvId(conv.id);
      setMode('chat');
      setInput('');
      await loadMessages();
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  }, [input]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !convId) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      const msg = await sendMessage(convId, content);
      setMessages((prev) => [...prev, msg]);
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể gửi tin nhắn');
      setInput(content);
    } finally {
      setSending(false);
    }
  }, [input, convId]);

  const handleSelectConversation = useCallback((id: string) => {
    setConvId(id);
    setMode('chat');
  }, []);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  // ── Conversation List ──
  if (mode === 'list') {
    return (
      <SafeAreaView style={commonStyles.screen}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
        <View style={styles.header}>
          <BackButton onPress={() => navigation.goBack()} />
          <Text style={styles.title}>Hỗ trợ</Text>
          <View style={{ width: 60 }} />
        </View>

        {conversations.length === 0 && !loading ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>Bạn chưa có hội thoại nào</Text>
            <Text style={styles.emptyHint}>Nhập tin nhắn bên dưới để bắt đầu</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.convCard} onPress={() => handleSelectConversation(item.id)}>
                <View style={styles.convAvatar}>
                  <Text style={styles.convAvatarText}>💬</Text>
                </View>
                <View style={styles.convMid}>
                  <Text style={styles.convSubject}>{item.subject}</Text>
                  <Text style={styles.convLastMsg} numberOfLines={1}>
                    {item.last_message || 'Chưa có tin nhắn'}
                  </Text>
                </View>
                <View style={styles.convRight}>
                  <Text style={styles.convTime}>
                    {item.last_message_at ? formatTime(item.last_message_at) : ''}
                  </Text>
                  {(item.unread || 0) > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text style={styles.unreadText}>{item.unread}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Nhập tin nhắn..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleNewChat}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendBtnText}>Gửi</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Chat Detail ──
  return (
    <SafeAreaView style={commonStyles.screen} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      <View style={styles.header}>
        <BackButton onPress={() => setMode('list')} />
        <Text style={styles.title}>Hải Sản Hà Nội</Text>
        <View style={{ width: 60 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
        ) : messages.length === 0 ? (
          <View style={styles.emptyChat}>
            <Text style={styles.emptyHint}>Chưa có tin nhắn. Hãy gửi tin nhắn cho Shop!</Text>
          </View>
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.msgList}
            onContentSizeChange={() => flatRef.current?.scrollToEnd()}
            renderItem={({ item }) => (
              <View style={[styles.msgRow, item.sender_type === 'customer' ? styles.msgOwn : styles.msgOther]}>
                <View
                  style={[
                    styles.msgBubble,
                    item.sender_type === 'customer' ? styles.msgBubbleOwn : styles.msgBubbleOther,
                  ]}
                >
                  {item.content ? <Text style={styles.msgText}>{item.content}</Text> : null}
                  {item.image_url ? (
                    <Text style={styles.msgImage}>📷 [Hình ảnh]</Text>
                  ) : null}
                  <Text
                    style={[
                      styles.msgTime,
                      item.sender_type === 'customer' ? styles.msgTimeOwn : styles.msgTimeOther,
                    ]}
                  >
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            )}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.chatInput}
            placeholder="Nhập tin nhắn..."
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator color={colors.white} size="small" />
            ) : (
              <Text style={styles.sendBtnText}>Gửi</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: { fontSize: 17, fontWeight: '800', color: colors.navy },

  // Conversation List
  list: { padding: 8, gap: 4 },
  convCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  convAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convAvatarText: { fontSize: 20 },
  convMid: { flex: 1 },
  convSubject: { fontSize: 14, fontWeight: '700', color: colors.navy },
  convLastMsg: { fontSize: 12, color: colors.muted, marginTop: 2 },
  convRight: { alignItems: 'flex-end', gap: 4 },
  convTime: { fontSize: 11, color: '#9AA7AB' },
  unreadBadge: {
    backgroundColor: colors.coral,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  unreadText: { color: colors.white, fontSize: 10, fontWeight: '800' },

  // Chat
  msgList: { padding: 16, gap: 8, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 4 },
  msgOwn: { justifyContent: 'flex-end' },
  msgOther: { justifyContent: 'flex-start' },
  msgBubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 12,
  },
  msgBubbleOwn: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  msgBubbleOther: {
    backgroundColor: '#E8ECEF',
    borderBottomLeftRadius: 4,
  },
  msgText: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  msgImage: { fontSize: 13, color: colors.muted, marginTop: 2 },
  msgTime: { fontSize: 10, marginTop: 4 },
  msgTimeOwn: { color: 'rgba(255,255,255,0.7)', textAlign: 'right' },
  msgTimeOther: { color: '#9AA7AB' },

  // Input
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.white,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    color: colors.navy,
  },
  sendBtn: {
    height: 40,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: colors.white, fontSize: 14, fontWeight: '700' },

  // Empty
  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 12, opacity: 0.5 },
  emptyText: { fontSize: 15, color: colors.navy, fontWeight: '600', marginBottom: 4 },
  emptyHint: { fontSize: 13, color: colors.muted, textAlign: 'center' },
});
