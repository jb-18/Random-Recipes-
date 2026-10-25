let db;
const request = indexedDB.open("recipes", 1);
const dishName = document.getElementById("dishName");
const description = document.getElementById("description");
const ingredientsList = document.getElementById("ingredientsList");
const preparationList = document.getElementById("preparationList");
const addIngredientButton = document.getElementById("addIngredientButton");
const removeIngredientButton = document.getElementById("removeIngredientButton");
const addPreparationButton = document.getElementById("addPreparationButton");
const removePreparationButton = document.getElementById("removePreparationButton");
const clearButton = document.getElementById("clearButton");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");
const errorMessage = document.getElementById("errorMessage");
const savedRecipes = document.getElementById("savedRecipes");

const STARTING_ROWS = 4;

function previewImage(event) {
    const file = event.target.files[0];

    // Free the memory used by the last picture
    if (imagePreview.src) {
        URL.revokeObjectURL(imagePreview.src);
    }

    if (!file) {
        imagePreview.removeAttribute("src");
        imagePreview.hidden = true;
        return;
    }

    imagePreview.src = URL.createObjectURL(file);
    imagePreview.hidden = false;
}

function addRow(list, className, placeholder) {
    const item = document.createElement("li");
    const box = document.createElement("textarea");
    box.className = className;
    box.placeholder = placeholder;
    item.appendChild(box);
    list.appendChild(item);
}

function removeRow(list) {
    if (list.children.length > 1) {
        list.removeChild(list.lastElementChild);
    }
}

function addIngredient() {
    addRow(ingredientsList, "ingredientsText", "Ingredients");
}

function addPreparation() {
    addRow(preparationList, "preparationText", "How you make it?");
}

addIngredientButton.addEventListener("click", addIngredient);
removeIngredientButton.addEventListener("click", () => removeRow(ingredientsList));
addPreparationButton.addEventListener("click", addPreparation);
removePreparationButton.addEventListener("click", () => removeRow(preparationList));


function getListValues(list) {
    return Array.from(list.querySelectorAll("textarea"))
        .map(textarea => textarea.value.trim())
        .filter(text => text !== "");
}

document.querySelector("form").addEventListener("submit", (e) => {
    e.preventDefault();

    // The database takes a moment to open, so make sure it's ready
    if (!db) {
        errorMessage.textContent = "Database is still loading, try again in a second";
        return;
    }

    if (dishName.value.trim() === "") {
        errorMessage.textContent = "Give your dish a name first!";
        return;
    }
    errorMessage.textContent = "";

    const recipe = {
        name: dishName.value.trim(),
        description: description.value.trim(),
        ingredients: getListValues(ingredientsList),
        preparation: getListValues(preparationList),
        image: imageInput.files[0] || null,
        createdAt: new Date()
    };

    const tx = db.transaction("recipes", "readwrite");
    const store = tx.objectStore("recipes");
    store.add(recipe);

    tx.oncomplete = () => {
        console.log("Recipe saved successfully");
        clearButton.click(); // empty the form for the next recipe
        showSavedRecipes();
    };
    tx.onerror = (event) => {
        console.error("Error saving recipe:", event.target.error);
        errorMessage.textContent = "Could not save the recipe";
    };
});

function showSavedRecipes() {
    const tx = db.transaction("recipes", "readonly");
    const request = tx.objectStore("recipes").getAll();

    request.onsuccess = () => {
        const recipes = request.result;
        savedRecipes.innerHTML = "";

        if (recipes.length === 0) {
            savedRecipes.textContent = "No recipes saved yet.";
            return;
        }

        // Newest recipe first
        recipes.reverse().forEach(recipe => {
            savedRecipes.appendChild(makeRecipeCard(recipe));
        });
    };
}

function makeRecipeCard(recipe) {
    const card = document.createElement("div");
    card.className = "recipeCard";

    const title = document.createElement("h3");
    title.textContent = recipe.name;
    card.appendChild(title);

    if (recipe.image) {
        const img = document.createElement("img");
        img.className = "preview";
        img.alt = recipe.name;
        img.src = URL.createObjectURL(recipe.image);
        card.appendChild(img);
    }

    if (recipe.description) {
        const desc = document.createElement("p");
        desc.textContent = recipe.description;
        card.appendChild(desc);
    }

    card.appendChild(makeList("ul", recipe.ingredients));
    card.appendChild(makeList("ol", recipe.preparation));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "remove";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deleteRecipe(recipe.id));
    card.appendChild(deleteButton);
    const printButton = document.createElement("button");
    printButton.type = "button";
    printButton.className = "add";
    printButton.textContent = "Print";
    printButton.addEventListener("click", () => printOneRecipe(card));
    card.appendChild(printButton);
    return card;
}

function makeList(type, items) {
    const list = document.createElement(type);
    items.forEach(text => {
        const item = document.createElement("li");
        item.textContent = text;
        list.appendChild(item);
    });
    return list;
}

function printOneRecipe(card) {
    card.classList.add("printing");
    document.body.classList.add("print-one");
    window.print();
}

window.addEventListener("afterprint", () => {
    document.body.classList.remove("print-one");
    document.querySelectorAll(".printing").forEach(c => c.classList.remove("printing"));
});

function deleteRecipe(id) {
    const tx = db.transaction("recipes", "readwrite");
    tx.objectStore("recipes").delete(id);
    tx.oncomplete = () => showSavedRecipes();
}


clearButton.addEventListener("click", () => {
    dishName.value = "";
    description.value = "";

    imageInput.value = "";
    previewImage({ target: imageInput });

    ingredientsList.innerHTML = "";
    preparationList.innerHTML = "";
    for (let i = 0; i < STARTING_ROWS; i++) {
        addIngredient();
        addPreparation();
    }
});


request.onerror = (event) => {
    console.error("Database error:", event.target.error);
    errorMessage.textContent = "Error accessing database";
};

request.onupgradeneeded = (event) => {
    const db = event.target.result;
    db.createObjectStore("recipes", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (event) => {
    db = event.target.result;
    showSavedRecipes();
};