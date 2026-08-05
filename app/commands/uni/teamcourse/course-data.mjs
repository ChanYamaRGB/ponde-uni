// 作成中のコースを保存
const courseSessions = new Map();

export function createSession(userId) {
  courseSessions.set(userId, {
    step: 0,

    courseName: "",

    songs: [
      {
        genre: null,
        title: "",
        difficulty: ""
      },
      {
        genre: null,
        title: "",
        difficulty: ""
      },
      {
        genre: null,
        title: "",
        difficulty: ""
      }
    ],

    life: null,
    rule: null
  });

  return courseSessions.get(userId);
}

export function getSession(userId) {
  return courseSessions.get(userId);
}

export function deleteSession(userId) {
  courseSessions.delete(userId);
}
