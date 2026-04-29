import { useState, useMemo, useRef } from "react"
import axios from "axios"
import html2canvas from "html2canvas"

export default function App() {
  const [paidBy, setPaidBy] = useState("")
  const [people, setPeople] = useState([""])
  const [menu, setMenu] = useState([{ name: "", price: "" }])
  const [orders, setOrders] = useState([])
  const [tax, setTax] = useState("")
  const [service, setService] = useState("")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const resultRef = useRef()

  const formatRupiah = (num) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR"
    }).format(num || 0)

  const formatNumber = (value) => {
    if (!value) return ""
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  }

  const unformatNumber = (value) => value.replace(/\./g, "")

  // ===== PEOPLE =====
  const addPerson = () => setPeople([...people, ""])

  const updatePerson = (i, val) => {
    setPeople(prev => prev.map((p, idx) => idx === i ? val : p))
  }

  const removePerson = (i) => {
    setPeople(prev => prev.filter((_, idx) => idx !== i))
  }

  // ===== MENU =====
  const addMenu = () => setMenu([...menu, { name: "", price: "" }])

  const updateMenu = (i, field, val) => {
    setMenu(prev =>
      prev.map((m, idx) =>
        idx === i ? { ...m, [field]: val } : m
      )
    )
  }

  const removeMenu = (i) => {
    setMenu(prev => prev.filter((_, idx) => idx !== i))
  }

  // ===== ORDERS =====
  const addOrder = () => {
    setOrders(prev => [
      ...prev,
      {
        id: Date.now(),
        persons: [],
        menu: "",
        qty: 1
      }
    ])
  }

  const updateOrder = (i, field, val) => {
    setOrders(prev =>
      prev.map((o, idx) =>
        idx === i
          ? {
              ...o,
              [field]:
                field === "qty"
                  ? Number(val)
                  : typeof val === "string"
                  ? val.trim()
                  : val
            }
          : o
      )
    )
  }

  const removeOrder = (i) => {
    setOrders(prev => prev.filter((_, idx) => idx !== i))
  }

  // ===== VALID =====
  const validPeople = people.filter(p => p && p.trim() !== "")

  const validMenu = menu
    .map(m => ({ ...m, name: m.name.trim() }))
    .filter(m => m.name !== "")

  const submitMenu = menu.filter(m => m.name && m.price)

  const validOrders = orders.filter(o =>
    o.menu &&
    o.qty > 0 &&
    Array.isArray(o.persons) &&
    o.persons.length > 0
  )

  // ===== DETAIL =====
  const detail = useMemo(() => {
    const menuMap = {}

    menu.forEach(m => {
      if (m.name && m.price) {
        menuMap[m.name.trim()] = Number(unformatNumber(m.price))
      }
    })

    const res = {}

    orders.forEach(o => {
      if (!o.menu || !o.persons?.length) return

      const price = menuMap[o.menu] || 0
      const total = price * o.qty
      const split = total / o.persons.length

      o.persons.forEach(p => {
        if (!res[p]) res[p] = { items: [], total: 0 }
        res[p].items.push(`${o.menu} x${o.qty}`)
        res[p].total += split
      })
    })

    return res
  }, [orders, menu])

  // ===== SUBMIT =====
  const handleSubmit = async () => {
    if (!paidBy) return alert("Pilih siapa yang bayar")
    if (submitMenu.length === 0) return alert("Harga menu belum lengkap")
    if (validOrders.length === 0)
      return alert("Order belum lengkap")

    try {
      setLoading(true)

      const res = await axios.post(
        "https://splitbillskuy-api.onrender.com/calculate",
        {
          paidBy,
          tax: Number(tax || 0),
          service: Number(service || 0),
          menu: submitMenu.map(m => ({
            name: m.name.trim(),
            price: Number(unformatNumber(m.price))
          })),
          orders: validOrders
        }
      )

      setResult(res.data)
    } catch (err) {
      alert("Error: " + (err.response?.data?.error || err.message))
    } finally {
      setLoading(false)
    }
  }

  // ===== EXPORT =====
  const handleExport = async () => {
    const canvas = await html2canvas(resultRef.current, {
      backgroundColor: "#fff",
      scale: 2
    })

    const link = document.createElement("a")
    link.download = "splitbill.png"
    link.href = canvas.toDataURL()
    link.click()
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-black text-white text-center py-4 text-xl font-semibold">
        SplitBillskuy 💸
      </div>

      <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-6">

        {/* LEFT */}
        <div className="space-y-6">

          <Card title="Siapa yang bayar?">
            <select className="input" value={paidBy} onChange={(e) => setPaidBy(e.target.value)}>
              <option value="">-- pilih --</option>
              {validPeople.map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>
          </Card>

          <Card title="People">
            {people.map((p, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="input flex-1"
                  value={p}
                  placeholder="Nama"
                  onChange={(e) => updatePerson(i, e.target.value)}
                />
                <button onClick={() => removePerson(i)} className="bg-red-500 text-white px-3 rounded">✕</button>
              </div>
            ))}
            <button onClick={addPerson} className="btn-blue">+ Tambah Orang</button>
          </Card>

          <Card title="Menu">
            {menu.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  className="input w-1/2"
                  value={m.name}
                  placeholder="Nama menu"
                  onChange={(e) => updateMenu(i, "name", e.target.value)}
                />
                <input
                  className="input w-1/2"
                  value={formatNumber(m.price)}
                  placeholder="Harga"
                  onChange={(e) => {
                    const raw = unformatNumber(e.target.value)
                    if (raw === "" || !isNaN(raw)) {
                      updateMenu(i, "price", raw)
                    }
                  }}
                />
                <button onClick={() => removeMenu(i)} className="bg-red-500 text-white px-3 rounded">✕</button>
              </div>
            ))}
            <button onClick={addMenu} className="btn-green">+ Tambah Menu</button>
          </Card>

          <Card title="Orders">
            {orders.map((o, i) => (
              <div key={o.id} className="mb-3 bg-gray-50 p-3 rounded">

                <div className="flex gap-2 mb-2">
                  <select
                    key={validMenu.map(m => m.name).join("-")} // 🔥 FIX
                    className="input flex-1"
                    value={o.menu || ""}
                    onChange={(e) => updateOrder(i, "menu", e.target.value)}
                  >
                    <option value="">-- pilih menu --</option>
                    {validMenu.map((m, idx) => (
                      <option key={idx} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <input
                    className="input w-20"
                    type="number"
                    value={o.qty}
                    onChange={(e) => updateOrder(i, "qty", e.target.value)}
                  />

                  <button onClick={() => removeOrder(i)} className="bg-red-500 text-white px-3 rounded">✕</button>
                </div>

                <div className="text-xs text-blue-500 mb-1">
                  Selected: {o.menu || "-"}
                </div>

                <div className="flex flex-wrap gap-2">
                  {validPeople.map((p, idx) => (
                    <label key={idx} className="flex items-center gap-1 text-sm bg-white px-2 py-1 rounded border">
                      <input
                        type="checkbox"
                        checked={o.persons.includes(p)}
                        onChange={(e) => {
                          let updated = [...o.persons]
                          if (e.target.checked) updated.push(p)
                          else updated = updated.filter(x => x !== p)
                          updateOrder(i, "persons", updated)
                        }}
                      />
                      {p}
                    </label>
                  ))}
                </div>

              </div>
            ))}
            <button onClick={addOrder} className="btn-purple">+ Tambah Order</button>
          </Card>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          <Card title="Tax & Service">
            <div className="flex gap-2">
              <input className="input w-1/2" placeholder="Tax (%)" value={tax} onChange={(e) => setTax(e.target.value)} />
              <input className="input w-1/2" placeholder="Service (%)" value={service} onChange={(e) => setService(e.target.value)} />
            </div>
          </Card>

          <button onClick={handleSubmit} className="w-full bg-black text-white py-3 rounded-xl">
            {loading ? "Calculating..." : "Calculate 💸"}
          </button>

          {result && (
            <>
              <div ref={resultRef} className="bg-white p-6 rounded-xl shadow">
                <h2 className="font-bold mb-2">Hasil</h2>

                <p>Total: <b>{formatRupiah(result.total)}</b></p>
                <p>Yang bayar: <b>{paidBy}</b></p>

                {Object.keys(detail).map((name, i) => (
                  <div key={i} className="bg-gray-100 p-2 mt-2 rounded">
                    <b>{name}</b><br />
                    {detail[name].items.join(", ")}<br />
                    <b>{formatRupiah(detail[name].total)}</b>
                  </div>
                ))}

                <div className="mt-2 text-sm">
                  Tax: {tax || 0}% | Service: {service || 0}%
                </div>

                <div className="mt-2">
                  {result.transfers.map((t, i) => (
                    <div key={i}>
                      {t.from} ➜ {t.to} : {formatRupiah(t.amount)}
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={handleExport} className="w-full bg-green-600 text-white py-2 rounded">
                Export ke Gambar 📸
              </button>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

function Card({ title, children }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  )
}