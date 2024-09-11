public class Item implements Comparable<Item> {
    private String name;
    private int value;
    private boolean isWeapon;
    private boolean isFood;
    private boolean isSold;
    private int atk;
    private int str;
    private int hp;

    public Item(String name, int value, boolean isWeapon, boolean isFood, boolean isSold) {
        this.name = name;
        this.value = value;
        this.isWeapon = isWeapon;
        this.isFood = isFood;
        this.isSold = isSold;
        this.atk = 0;
        this.str = 0;
        
    }

    public int getValue() {
        return this.value;
    }

    public String getName() {
        return this.name;
    }

    public boolean isWeapon() {
        return this.isWeapon;
    }

    public boolean isSold() {
        return this.isSold;
    }

    public boolean isFood() {
        return this.isFood;
    }

    public int getAtk() {
        return this.atk;
    }

    public int getStr() {
        return this.str;
    }

    public void setStats(int atk, int str) {
        if (this.isWeapon) {
            this.atk = atk;
            this.str = str;
        }
    }

    public void setHp(int hp) {
        if (this.isFood()) {
            this.hp = hp;
        }
    }

    public int getHp() {
        return this.hp;
    }

    public void displayInfo() {
        System.out.println("Item: " + this.name);
        System.out.println("Value: " + this.value);
        System.out.println("Is Weapon: " + this.isWeapon);
        if (this.isWeapon) {
            System.out.println("Attack: " + this.atk);
            System.out.println("Strength: " + this.str);
        }
    }

    public String toString() {
        return this.name;
    }

    public int compareTo(Item other) {
        int compare;
        if (this.value > other.value) {
            compare = 1;
        } else if (this.value == other.value) {
            compare = 0;
        } else {
            compare = -1;
        }
        return compare;
    }

}