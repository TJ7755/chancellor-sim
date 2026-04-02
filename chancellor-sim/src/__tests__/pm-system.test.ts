import { markMessageAsRead } from '../pm-system';

describe('PM message reads', () => {
  it('marks a message as read and recalculates unread count', () => {
    const state: any = {
      messages: [
        { id: 'm1', read: false },
        { id: 'm2', read: false },
        { id: 'm3', read: true },
      ],
      unreadCount: 2,
    };

    const updated = markMessageAsRead(state, 'm2');

    expect(updated.messages.find((message: any) => message.id === 'm2')?.read).toBe(true);
    expect(updated.unreadCount).toBe(1);
  });
});
