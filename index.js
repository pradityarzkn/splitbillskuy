const express = require("express")
const cors = require("cors")

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// health check
app.get("/", (req, res) => {
  res.send("Split Bill API FINAL 🚀")
})

app.post("/calculate", (req, res) => {
  const { paidBy, menu, orders, tax = 0, service = 0 } = req.body

  // ===== VALIDASI =====
  if (!paidBy || !Array.isArray(menu) || !Array.isArray(orders)) {
    return res.status(400).json({
      error: "paidBy, menu, orders wajib diisi"
    })
  }

  // ===== 1. MAP MENU =====
  const menuMap = {}
  menu.forEach(m => {
    if (m.name && m.price !== undefined) {
      menuMap[m.name] = Number(m.price)
    }
  })

  if (Object.keys(menuMap).length === 0) {
    return res.status(400).json({
      error: "Menu kosong atau harga belum diisi"
    })
  }

  // ===== 2. HITUNG SUBTOTAL =====
  const personSubtotal = {}
  let subtotal = 0

  for (const o of orders) {

    if (!o.menu) {
      return res.status(400).json({
        error: "Menu pada order kosong"
      })
    }

    const price = menuMap[o.menu]

    if (price === undefined) {
      return res.status(400).json({
        error: `Menu ${o.menu} tidak ditemukan`
      })
    }

    if (!o.qty || o.qty <= 0) {
      return res.status(400).json({
        error: `Qty tidak valid di menu ${o.menu}`
      })
    }

    // 🔥 FIX PENTING: normalize persons
    const persons = Array.isArray(o.persons) ? o.persons.filter(p => p) : []

    if (persons.length === 0) {
      return res.status(400).json({
        error: `Pilih orang untuk menu ${o.menu}`
      })
    }

    const totalItem = price * o.qty
    const split = totalItem / persons.length

    persons.forEach(p => {
      if (!personSubtotal[p]) {
        personSubtotal[p] = 0
      }

      personSubtotal[p] += split
    })

    subtotal += totalItem
  }

  // ===== EDGE CASE =====
  if (subtotal === 0) {
    return res.status(400).json({
      error: "Subtotal tidak boleh 0"
    })
  }

  // ===== 3. TAX & SERVICE =====
  const taxAmount = subtotal * (tax / 100)
  const serviceAmount = subtotal * (service / 100)
  const total = subtotal + taxAmount + serviceAmount

  // ===== 4. INIT BALANCE =====
  const balances = {}
  Object.keys(personSubtotal).forEach(p => {
    balances[p] = 0
  })

  // ===== 5. DISTRIBUSI =====
  Object.keys(personSubtotal).forEach(p => {
    const ratio = personSubtotal[p] / subtotal

    const finalShare =
      personSubtotal[p] +
      (taxAmount * ratio) +
      (serviceAmount * ratio)

    balances[p] -= finalShare
  })

  // ===== 6. YANG BAYAR =====
  balances[paidBy] = (balances[paidBy] || 0) + total

  // ===== 7. SPLIT =====
  const creditors = []
  const debtors = []

  Object.keys(balances).forEach(name => {
    const val = Math.round(balances[name])

    if (val > 0) {
      creditors.push({ name, amount: val })
    } else if (val < 0) {
      debtors.push({ name, amount: -val })
    }
  })

  // ===== 8. SETTLEMENT =====
  const transfers = []

  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i]
    const c = creditors[j]

    const pay = Math.min(d.amount, c.amount)

    transfers.push({
      from: d.name,
      to: c.name,
      amount: pay
    })

    d.amount -= pay
    c.amount -= pay

    if (d.amount === 0) i++
    if (c.amount === 0) j++
  }

  // ===== RESPONSE =====
  res.json({
    subtotal,
    taxAmount,
    serviceAmount,
    total,
    personSubtotal,
    balances,
    transfers
  })
})

app.listen(PORT, () => {
  console.log(`Server jalan di port ${PORT}`)
})