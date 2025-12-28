// Loader for Recipe Database page
const recipeDatabaseLoader = async () => {
    return {
        title: "Recipe Database - NoBullFit",
        meta: [
            { name: "description", content: "Browse and search recipes created by the NoBullFit community" }
        ]
    };
};

export default recipeDatabaseLoader;
