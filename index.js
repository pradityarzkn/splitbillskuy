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
  if (!paidBy || !menu || !orders) {
    return res.status(400).json({
      error: "paidBy, menu, orders wajib diisi"
    })
  }

  // ===== 1. MAP MENU =====
  const menuMap = {}
  menu.forEach(m => {
    if (m.name) {
      menuMap[m.name] = Number(m.price || 0)
    }
  })

  // ===== 2. HITUNG SUBTOTAL =====
  const personSubtotal = {}
  let subtotal = 0

  for (const o of orders) {
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

    const totalItem = price * o.qty

    // 🔥 PRIORITAS: persons (FE terbaru)
    if (o.persons && Array.isArray(o.persons)) {
      if (o.persons.length === 0) {
        return res.status(400).json({
          error: `Person kosong di order ${o.menu}`
        })
      }

      const split = totalItem / o.persons.length

      o.persons.forEach(p => {
        if (!personSubtotal[p]) {
          personSubtotal[p] = 0
        }

        personSubtotal[p] += split
      })

      subtotal += totalItem
    }

    // 🔥 BACKWARD COMPATIBILITY (kalau masih ada yg pakai lama)
    else if (o.person) {
      if (!personSubtotal[o.person]) {
        personSubtotal[o.person] = 0
      }

      personSubtotal[o.person] += totalItem
      subtotal += totalItem
    }

    else {
      return res.status(400).json({
        error: `Person kosong di order ${o.menu}`
      })
    }
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