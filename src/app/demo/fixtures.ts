// Вымышленные контакты. Формат событий соответствует GREEN-API Telegram.
export const contacts = [
  { id: '100001', title: 'Алексей Морозов', username: '@alexey_demo', phone: 79990000001 },
  { id: '100002', title: 'Анна Смирнова', username: '@anna_demo', phone: 79990000002 },
  { id: '100003', title: 'Михаил Волков', username: '@mikhail_demo', phone: 79990000003 },
];

export function textEvent(
  chatId: string,
  text: string,
  outgoing = false,
  timestamp = Date.now(),
  id = crypto.randomUUID(),
) {
  const contact = contacts.find((item) => item.id === chatId);
  return {
    typeWebhook: outgoing ? 'outgoingMessageReceived' : 'incomingMessageReceived',
    instanceData: { idInstance: 4100000000, wid: '79990000000@c.us', typeInstance: 'telegram' },
    timestamp: Math.floor(timestamp / 1000),
    idMessage: id,
    senderData: {
      chatId,
      chatName: contact?.title || chatId,
      sender: chatId,
      senderName: contact?.title || chatId,
    },
    messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: text } },
  };
}

export function historyEvents() {
  const now = Date.now();
  return [
    textEvent(
      '100003',
      'Привет! Отправил материалы по проекту. Посмотри, когда будет время.',
      false,
      now - 7_200_000,
    ),
    textEvent('100002', 'Привет! Сможешь сегодня посмотреть интерфейс?', false, now - 3_600_000),
    textEvent('100002', 'Да, после обеда напишу обратную связь.', true, now - 3_540_000),
    textEvent('100002', 'Отлично, спасибо 🙌', false, now - 3_480_000),
    textEvent('100001', 'Привет! Как продвигается работа над чатом?', false, now - 600_000),
    textEvent(
      '100001',
      'Привет! Основные сценарии готовы. Сейчас проверяю отправку и ответы.',
      true,
      now - 540_000,
    ),
    textEvent(
      '100001',
      'Здорово! Напиши мне что-нибудь — проверим, как приходят сообщения.',
      false,
      now - 480_000,
    ),
  ];
}
