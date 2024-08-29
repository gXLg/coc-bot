module.exports = (success) => {
  let emojis;
  if (success) {
    emojis = [
      "innocent",
      "point_up",
      "smiling_face_with_3_hearts",
      "fire",
      "tada",
      "grin"
    ];
  } else {
    emojis = [
      "person_shrugging",
      "face_with_monocle",
      "sob",
      "grimacing",
      "person_facepalming",
      "person_gesturing_no"
    ];
  }
  return ":" + emojis[parseInt(Math.random() * emojis.length)] + ": ";
};
