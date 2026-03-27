import { auth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

export function initExtensionBridge() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.postMessage(
        {
          type: "CHAOSLENS_UID",
          uid: user.uid
        },
        "*"
      );
    }
  });
}