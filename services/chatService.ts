export const BASE_URL = 'https://chat.googleapis.com/v1';

export const chatService = {
  // 1. Get list of conversations (Spaces)
  async getSpaces(accessToken: string) {
    const response = await fetch(`${BASE_URL}/spaces?pageSize=100`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch spaces: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  // 2. Get messages from a specific space
  async getMessages(accessToken: string, spaceName: string) {
    const response = await fetch(`${BASE_URL}/${spaceName}/messages?pageSize=50`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch messages: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  // 3. Send a message
  async sendMessage(accessToken: string, spaceName: string, text: string) {
    const response = await fetch(`${BASE_URL}/${spaceName}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send message: ${response.status} ${errorText}`);
    }
    return response.json();
  },

  // 4. Get members of a space
  async getMembers(accessToken: string, spaceName: string) {
    const response = await fetch(`${BASE_URL}/${spaceName}/members`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch members: ${response.status} ${errorText}`);
    }
    return response.json();
  }
};