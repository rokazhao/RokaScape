import java.util.*;

public class NPC {
    private String name;
    private Map<String, String> dialogues;
    private int order;

    public NPC(String name, int order) {
        this.name = name;
        this.order = order;
        this.dialogues = new HashMap<>();
    }

    public String getName() {
        return this.name;
    }

    public void addDialogue(String key, String dialogue) {
        dialogues.put(key, dialogue);
    }

    public int getDialogueOptions() {
        int count = 1;
        for (String option : dialogues.keySet()) {
            System.out.println(count + ": " + option);
            count++;
        }
        return count;
    }

    public void speak(String key) {
        if (dialogues.get(key) != null) {
            System.out.println(this.name + ": " + dialogues.get(key));
        } else {
            System.out.println("Invalid dialogue option, try again.");
        }
    }

    public String toString() {
        return this.name;
    }

    public Map<String, String> getDialogues() {
        return this.dialogues;
    }

    public int getOrder() {
        return this.order;
    }
}