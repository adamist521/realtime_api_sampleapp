const express = require('express');
const app = express();
const server = require('http').createServer(app);
const WebSocket = require('ws');
const dotenv = require("dotenv");
dotenv.config();

// 静的ファイルを提供するディレクトリを設定
app.use(express.static('public'));

// ルートパスにHTMLを提供
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});

// function main() {
const wss = new WebSocket.Server({ server });

wss.on('connection', function connection(ws) {
  // Connect to the API
  const url = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01";
  const openaiWs = new WebSocket(url, {
      headers: {
          "Authorization": "Bearer " + process.env.OPENAI_API_KEY,
          "OpenAI-Beta": "realtime=v1",
      },
  });

  async function handleOpen() {
    console.log("OpenAI WebSocket connection opened");
  }
  openaiWs.on("open", handleOpen);

  async function handleMessage(messageStr) {
    const message = JSON.parse(messageStr);
    // Define what happens when a message is received
    ws.send(messageStr);
    switch(message.type) {
      case "response.text.delta":
        // We got a new text chunk, print it
        process.stdout.write(message.delta + "\n");
        break;
      case "response.text.done":
        // The text is complete, print a new line
        process.stdout.write("\n");
        break;
      case "response.done":
        // Response complete, close the socket
        // openaiWs.close();
        break;
    }
  }
  openaiWs.on("message", handleMessage);

  async function handleClose() {
    console.log("Socket closed");
  }
  openaiWs.on("close", handleClose);

  async function handleError(error) {
    console.log("Error", error);
  }
  openaiWs.on("error", handleError);


  // クライアントからのメッセージを処理
  ws.on('message', function(data) {
    try {
      const clientMessage = JSON.parse(data);
      
      if (clientMessage.type === 'user.message') {
        // OpenAIへの会話作成イベントを送信
        const createConversationEvent = {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [
              {
                type: "input_text",
                text: clientMessage.content
              }
            ]
          }
        };
        openaiWs.send(JSON.stringify(createConversationEvent));

        // レスポンス作成イベントを送信
        const createResponseEvent = {
          type: "response.create",
          response: {
              modalities: ["text"],
              instructions: "日本語で説明してください. 毎回の返信は最大でも10文字以内にしてください.",
          }
        }
        openaiWs.send(JSON.stringify(createResponseEvent));
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });


  });
