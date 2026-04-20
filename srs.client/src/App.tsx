import { useEffect, useState } from "react";

function App() {
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        fetch("http://localhost:5135/api/home")
            .then(res => res.json())
            .then(data => setData(data))
            .catch(err => console.error(err));
    }, []);

    return (
        <div>
            <h1>Frontend</h1>

            {data ? (
                <>
                    <p>{data.message}</p>
                    <p>{data.time}</p>
                </>
            ) : (
                <p>Loading...</p>
            )}
        </div>
    );
}

export default App;